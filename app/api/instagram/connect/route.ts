/**
 * Instagram OAuth — Connect
 *
 * GET /api/instagram/connect
 * Redirects the user to Instagram's OAuth authorization page.
 */

import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/meta/oauth";

export async function GET() {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;
  const authUrl = getAuthorizationUrl(redirectUri);

  return NextResponse.redirect(authUrl);
}
