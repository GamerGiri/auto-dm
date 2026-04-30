/**
 * Instagram Posts API
 *
 * GET /api/instagram/posts — Fetch the authenticated user's recent Instagram posts
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { decryptToken } from "@/lib/meta/oauth";
import { getUserMedia } from "@/lib/meta/client";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Get the user and their encrypted access token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        instagramId: true,
        instagramUsername: true,
      },
    });

    if (!user || !user.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Instagram account not connected. Please connect your account first.",
        },
        { status: 400 }
      );
    }

    // Decrypt the token
    const accessToken = decryptToken(user.accessToken);

    // Fetch recent posts from Instagram
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 25;

    const posts = await getUserMedia(accessToken, limit);

    return NextResponse.json({ success: true, data: posts });
  } catch (err) {
    console.error("[Instagram Posts] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Instagram posts" },
      { status: 500 }
    );
  }
}
