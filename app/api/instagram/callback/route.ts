/**
 * Instagram OAuth — Callback
 *
 * GET /api/instagram/callback?code=...
 *
 * 1. Exchange authorization code for short-lived token
 * 2. Exchange short-lived token for long-lived token (60 days)
 * 3. Get user info from Instagram
 * 4. Encrypt and store the token in the database
 * 5. Redirect to dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, encryptToken } from "@/lib/meta/oauth";
import { getLongLivedToken, getUserInfo } from "@/lib/meta/client";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    console.error("[OAuth Callback] Error from Instagram:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=oauth_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=no_code`
    );
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;

    // 1. Exchange code for short-lived token
    const { accessToken: shortLivedToken, userId: instagramUserId } =
      await exchangeCodeForToken(code, redirectUri);

    // 2. Exchange for long-lived token (60 days)
    const { accessToken: longLivedToken, expiresIn } =
      await getLongLivedToken(shortLivedToken);

    // 3. Get user info
    const userInfo = await getUserInfo(longLivedToken);

    // 4. Encrypt the token
    const encryptedToken = encryptToken(longLivedToken);

    // 5. Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // 6. Upsert the user record
    const user = await prisma.user.upsert({
      where: { instagramId: instagramUserId },
      create: {
        instagramId: instagramUserId,
        instagramUsername: userInfo.username,
        name: userInfo.name,
        accessToken: encryptedToken,
        tokenExpiresAt,
      },
      update: {
        instagramUsername: userInfo.username,
        name: userInfo.name,
        accessToken: encryptedToken,
        tokenExpiresAt,
      },
    });

    console.log(
      `[OAuth Callback] User ${user.instagramUsername} connected successfully`
    );

    // 7. Redirect to dashboard
    // In Phase 2, this will set a session cookie via NextAuth
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?connected=true`
    );
  } catch (err) {
    console.error("[OAuth Callback] Error:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=oauth_failed`
    );
  }
}
