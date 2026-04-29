/**
 * Token Refresh Cron Job
 *
 * GET /api/cron/refresh-tokens
 *
 * Finds all users whose Instagram access tokens expire within the next 10 days
 * and refreshes them for another 60 days.
 *
 * Should be called daily by a cron job (e.g., Vercel Cron or external scheduler).
 * Secured by CRON_SECRET header check.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { decryptToken, encryptToken } from "@/lib/meta/oauth";
import { refreshLongLivedToken } from "@/lib/meta/client";

const DAYS_BEFORE_EXPIRY = 10;

export async function GET(request: NextRequest) {
  // Verify cron secret (simple auth for cron endpoints)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + DAYS_BEFORE_EXPIRY);

  try {
    // Find users whose tokens expire within the next 10 days
    const usersToRefresh = await prisma.user.findMany({
      where: {
        accessToken: { not: null },
        tokenExpiresAt: {
          not: null,
          lte: cutoffDate,
        },
      },
      select: {
        id: true,
        instagramUsername: true,
        accessToken: true,
      },
    });

    console.log(
      `[Token Refresh] Found ${usersToRefresh.length} token(s) to refresh`
    );

    const results: Array<{
      userId: string;
      username: string | null;
      status: "refreshed" | "failed";
      error?: string;
    }> = [];

    for (const user of usersToRefresh) {
      try {
        if (!user.accessToken) continue;

        // Decrypt the current token
        const currentToken = decryptToken(user.accessToken);

        // Refresh it
        const { accessToken: newToken, expiresIn } =
          await refreshLongLivedToken(currentToken);

        // Encrypt the new token
        const encryptedToken = encryptToken(newToken);
        const newExpiry = new Date(Date.now() + expiresIn * 1000);

        // Update in DB
        await prisma.user.update({
          where: { id: user.id },
          data: {
            accessToken: encryptedToken,
            tokenExpiresAt: newExpiry,
          },
        });

        results.push({
          userId: user.id,
          username: user.instagramUsername ?? null,
          status: "refreshed",
        });

        console.log(
          `[Token Refresh] Refreshed token for @${user.instagramUsername}`
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        results.push({
          userId: user.id,
          username: user.instagramUsername ?? null,
          status: "failed",
          error: errorMessage,
        });
        console.error(
          `[Token Refresh] Failed for @${user.instagramUsername}:`,
          errorMessage
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalProcessed: usersToRefresh.length,
        results,
      },
    });
  } catch (err) {
    console.error("[Token Refresh] Error:", err);
    return NextResponse.json(
      { success: false, error: "Token refresh job failed" },
      { status: 500 }
    );
  }
}
