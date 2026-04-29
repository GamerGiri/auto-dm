/**
 * DM Worker
 *
 * BullMQ worker that processes comment events and sends DMs.
 *
 * Pipeline:
 * 1. Find active automations for the media post
 * 2. Match comment text against keywords
 * 3. Check dedup (commentId already processed?)
 * 4. Check rate limit (≤190 DMs/hour per account)
 * 5. Send DM via Graph API
 * 6. Log result to DmLog table
 *
 * Retry: exponential backoff — 5min, 15min, 45min (3 attempts max)
 */

import { Worker, Job } from "bullmq";
import { getRedisConnection, type ProcessCommentJob } from "./client";
import { prisma } from "@/lib/db/client";
import { sendDM, MetaApiError } from "@/lib/meta/client";
import { decryptToken } from "@/lib/meta/oauth";
import { matchKeywords } from "@/lib/utils/keyword-matcher";
import {
  checkRateLimit,
  incrementDMCounter,
} from "@/lib/utils/rate-limiter";
import { getDMQueue } from "./client";

// Backoff delays in milliseconds: 5min, 15min, 45min
const BACKOFF_DELAYS = [5 * 60 * 1000, 15 * 60 * 1000, 45 * 60 * 1000];

/**
 * Process a single comment event:
 * Find matching automations → dedup → rate limit → send DM → log
 */
async function processComment(job: Job<ProcessCommentJob>): Promise<void> {
  const { commentId, commentText, commenterId, commenterName, mediaId } =
    job.data;
  const requeueAttempt = job.data.requeueAttempt ?? 0;

  // 1. Find all active automations for this media post
  const automations = await prisma.automation.findMany({
    where: {
      postId: mediaId,
      isActive: true,
    },
    include: {
      user: true,
    },
  });

  if (automations.length === 0) {
    // No automations configured for this post — nothing to do
    return;
  }

  for (const automation of automations) {
    const { user } = automation;

    // 2. Check keyword match
    const matchResult = matchKeywords(
      commentText,
      automation.keywords,
      automation.wholeWordMatch
    );

    if (!matchResult.matched) {
      continue; // Comment doesn't match any keyword for this automation
    }

    // 3. Check dedup — has this exact comment already been processed for this automation?
    const existingLog = await prisma.dmLog.findUnique({
      where: { commentId: `${automation.id}:${commentId}` },
    });

    if (existingLog) {
      // Already processed — skip
      continue;
    }

    // 4. Check rate limit
    if (!user.instagramId) {
      continue;
    }

    const rateLimit = await checkRateLimit(user.instagramId, requeueAttempt);

    if (!rateLimit.allowed) {
      if (rateLimit.shouldSkip) {
        // Exceeded max requeue attempts — log as skipped
        await prisma.dmLog.create({
          data: {
            automationId: automation.id,
            userId: user.id,
            commenterId,
            commenterName,
            commentText,
            commentId: `${automation.id}:${commentId}`,
            status: "SKIPPED_RATE_LIMIT",
          },
        });
        continue;
      }

      if (rateLimit.shouldRequeue) {
        // Requeue with delay
        const queue = getDMQueue();
        await queue.add(
          "process-comment",
          {
            ...job.data,
            requeueAttempt: requeueAttempt + 1,
          },
          {
            delay: rateLimit.requeueDelayMs,
          }
        );
        continue;
      }
    }

    // 5. Prepare and send DM
    if (!user.accessToken) {
      await prisma.dmLog.create({
        data: {
          automationId: automation.id,
          userId: user.id,
          commenterId,
          commenterName,
          commentText,
          commentId: `${automation.id}:${commentId}`,
          status: "FAILED",
          errorMessage: "No access token available",
        },
      });
      continue;
    }

    let accessToken: string;
    try {
      accessToken = decryptToken(user.accessToken);
    } catch {
      await prisma.dmLog.create({
        data: {
          automationId: automation.id,
          userId: user.id,
          commenterId,
          commenterName,
          commentText,
          commentId: `${automation.id}:${commentId}`,
          status: "FAILED",
          errorMessage: "Failed to decrypt access token",
        },
      });
      continue;
    }

    // Replace merge tags in the DM message
    const dmMessage = automation.dmMessage.replace(
      /\{username\}/gi,
      commenterName ?? "there"
    );

    try {
      await sendDM(accessToken, commenterId, dmMessage);

      // Increment rate limit counter
      await incrementDMCounter(user.instagramId);

      // Log success
      await prisma.dmLog.create({
        data: {
          automationId: automation.id,
          userId: user.id,
          commenterId,
          commenterName,
          commentText,
          commentId: `${automation.id}:${commentId}`,
          status: "SENT",
          dmSentAt: new Date(),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof MetaApiError
          ? `Meta API Error ${error.code}: ${error.message}`
          : error instanceof Error
            ? error.message
            : "Unknown error";

      await prisma.dmLog.create({
        data: {
          automationId: automation.id,
          userId: user.id,
          commenterId,
          commenterName,
          commentText,
          commentId: `${automation.id}:${commentId}`,
          status: "FAILED",
          errorMessage,
        },
      });

      // Re-throw to trigger BullMQ retry with backoff
      throw error;
    }
  }
}

/**
 * Create and start the DM processing worker.
 * Call this once at application startup.
 */
export function createDMWorker(): Worker<ProcessCommentJob> {
  const worker = new Worker<ProcessCommentJob>(
    "dm-processing",
    processComment,
    {
      connection: getRedisConnection(),
      concurrency: 5,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Custom exponential backoff: 5min, 15min, 45min
          const delay =
            BACKOFF_DELAYS[Math.min(attemptsMade - 1, BACKOFF_DELAYS.length - 1)];
          return delay;
        },
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[DM Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[DM Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message
    );
  });

  worker.on("error", (err) => {
    console.error("[DM Worker] Worker error:", err.message);
  });

  return worker;
}
