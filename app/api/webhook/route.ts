/**
 * Meta Webhook Handler
 *
 * GET  — Webhook verification (hub.mode, hub.verify_token, hub.challenge)
 * POST — Process incoming webhook events (comments)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, parseCommentEvents } from "@/lib/meta/webhook";
import { getDMQueue } from "@/lib/queue/client";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/webhook — Webhook verification endpoint
 *
 * Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge
 * to verify that the webhook URL is valid and owned by us.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("[Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[Webhook] Verification failed — invalid token or mode");
  return NextResponse.json(
    { success: false, error: "Verification failed" },
    { status: 403 }
  );
}

/**
 * POST /api/webhook — Process incoming webhook events
 *
 * 1. Verify X-Hub-Signature-256
 * 2. Parse comment events
 * 3. Queue background jobs
 * 4. Return 200 immediately (don't make Meta wait)
 */
export async function POST(request: NextRequest) {
  // Read the raw body for signature verification
  const rawBody = await request.text();

  // 1. Verify signature
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[Webhook] Invalid signature — rejecting request");
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Parse the payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // 2. Store the raw webhook event for debugging/audit
  try {
    await prisma.webhookEvent.create({
      data: {
        payload,
        processed: false,
      },
    });
  } catch (err) {
    console.error("[Webhook] Failed to store webhook event:", err);
    // Don't fail the request — continue processing
  }

  // 3. Parse comment events and queue jobs
  const commentEvents = parseCommentEvents(payload);
  const queue = getDMQueue();

  for (const event of commentEvents) {
    try {
      await queue.add("process-comment", {
        commentId: event.commentId,
        commentText: event.commentText,
        commenterId: event.commenterId,
        commenterName: event.commenterName,
        mediaId: event.mediaId,
      });
    } catch (err) {
      console.error("[Webhook] Failed to queue comment job:", err);
    }
  }

  // 4. Mark webhook event as processed
  // (best effort — don't block the response)

  // 5. Return 200 immediately
  return NextResponse.json({ success: true }, { status: 200 });
}
