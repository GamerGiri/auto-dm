/**
 * Meta Graph API Client
 *
 * Typed wrapper for Instagram Graph API v19+ operations.
 * Handles DM sending, comment fetching, user info, and token management.
 */

const GRAPH_API_BASE = "https://graph.instagram.com/v19.0";
const GRAPH_API_FB_BASE = "https://graph.facebook.com/v19.0";

// ─── Error Types ───────────────────────────────────────────────────────────────

export class MetaApiError extends Error {
  constructor(
    public code: number,
    public subcode: number | undefined,
    public fbTraceId: string | undefined,
    message: string
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

export class TokenExpiredError extends MetaApiError {
  constructor(message: string, fbTraceId?: string) {
    super(190, undefined, fbTraceId, message);
    this.name = "TokenExpiredError";
  }
}

export class RateLimitError extends MetaApiError {
  constructor(message: string, fbTraceId?: string) {
    super(368, undefined, fbTraceId, message);
    this.name = "RateLimitError";
  }
}

export class PermissionError extends MetaApiError {
  constructor(message: string, fbTraceId?: string) {
    super(100, undefined, fbTraceId, message);
    this.name = "PermissionError";
  }
}

// ─── Response Types ─────────────────────────────────────────────────────────────

interface GraphApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface InstagramUser {
  id: string;
  username: string;
  name?: string;
}

export interface InstagramComment {
  id: string;
  text: string;
  from: {
    id: string;
    username: string;
  };
  timestamp: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  permalink?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────────

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok || (data as GraphApiError).error) {
    const err = (data as GraphApiError).error;
    const code = err?.code ?? response.status;
    const subcode = err?.error_subcode;
    const traceId = err?.fbtrace_id;
    const message = err?.message ?? "Unknown Meta API error";

    switch (code) {
      case 190:
        throw new TokenExpiredError(message, traceId);
      case 368:
        throw new RateLimitError(message, traceId);
      case 100:
        throw new PermissionError(message, traceId);
      default:
        throw new MetaApiError(code, subcode, traceId, message);
    }
  }

  return data as T;
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Send a DM via the Instagram Messaging API.
 * Uses POST /me/messages on the Graph API.
 */
export async function sendDM(
  pageAccessToken: string,
  recipientId: string,
  message: string
): Promise<{ recipient_id: string; message_id: string }> {
  const response = await fetch(`${GRAPH_API_FB_BASE}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pageAccessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });

  return handleResponse(response);
}

/**
 * Fetch comments for a given Instagram media object.
 */
export async function getMediaComments(
  accessToken: string,
  mediaId: string
): Promise<InstagramComment[]> {
  const url = new URL(`${GRAPH_API_BASE}/${mediaId}/comments`);
  url.searchParams.set("fields", "id,text,from,timestamp");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  const data = await handleResponse<{ data: InstagramComment[] }>(response);
  return data.data;
}

/**
 * Get the authenticated user's profile info.
 */
export async function getUserInfo(
  accessToken: string
): Promise<InstagramUser> {
  const url = new URL(`${GRAPH_API_BASE}/me`);
  url.searchParams.set("fields", "id,username,name");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  return handleResponse<InstagramUser>(response);
}

/**
 * Fetch the user's recent Instagram media posts.
 */
export async function getUserMedia(
  accessToken: string,
  limit = 25
): Promise<InstagramMedia[]> {
  const url = new URL(`${GRAPH_API_BASE}/me/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink"
  );
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  const data = await handleResponse<{ data: InstagramMedia[] }>(response);
  return data.data;
}

/**
 * Exchange a short-lived token for a long-lived token (60 days).
 */
export async function getLongLivedToken(
  shortLivedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(`${GRAPH_API_BASE}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET!);
  url.searchParams.set("access_token", shortLivedToken);

  const response = await fetch(url.toString());
  const data = await handleResponse<TokenResponse>(response);

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 5184000, // default 60 days
  };
}

/**
 * Refresh a long-lived token before it expires.
 * Returns a new long-lived token valid for another 60 days.
 */
export async function refreshLongLivedToken(
  longLivedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(`${GRAPH_API_BASE}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", longLivedToken);

  const response = await fetch(url.toString());
  const data = await handleResponse<TokenResponse>(response);

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 5184000,
  };
}

/**
 * Subscribe an Instagram account to webhook events (comments + messages).
 */
export async function subscribeToWebhook(
  pageId: string,
  accessToken: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${GRAPH_API_FB_BASE}/${pageId}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subscribed_fields: ["comments", "messages"],
      }),
    }
  );

  return handleResponse(response);
}
