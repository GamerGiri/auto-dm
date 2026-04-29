/**
 * Webhook Signature Verification
 *
 * Verifies X-Hub-Signature-256 headers on incoming Meta webhook events
 * using HMAC-SHA256 with the Facebook App Secret.
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify the X-Hub-Signature-256 header from a Meta webhook POST request.
 *
 * @param payload - The raw request body as a string
 * @param signature - The X-Hub-Signature-256 header value (e.g. "sha256=abc123...")
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) {
    return false;
  }

  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    throw new Error("FACEBOOK_APP_SECRET environment variable is required");
  }

  const expectedSignature =
    "sha256=" +
    createHmac("sha256", appSecret).update(payload).digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Buffers have different lengths — signature is invalid
    return false;
  }
}

// ─── Webhook Event Types ────────────────────────────────────────────────────────

export interface WebhookCommentEvent {
  commentId: string;
  commentText: string;
  commenterId: string;
  commenterName?: string;
  mediaId: string;
}

interface WebhookEntry {
  id: string;
  time: number;
  changes?: Array<{
    field: string;
    value: {
      id: string;
      text: string;
      from: {
        id: string;
        username: string;
      };
      media: {
        id: string;
      };
    };
  }>;
}

interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

/**
 * Parse a webhook payload and extract comment events.
 *
 * Filters for `field === 'comments'` and returns structured event data.
 */
export function parseCommentEvents(
  payload: WebhookPayload
): WebhookCommentEvent[] {
  const events: WebhookCommentEvent[] = [];

  if (payload.object !== "instagram") {
    return events;
  }

  for (const entry of payload.entry) {
    if (!entry.changes) continue;

    for (const change of entry.changes) {
      if (change.field !== "comments") continue;

      const { value } = change;
      if (!value?.id || !value?.text || !value?.from?.id || !value?.media?.id) {
        continue;
      }

      events.push({
        commentId: value.id,
        commentText: value.text,
        commenterId: value.from.id,
        commenterName: value.from.username,
        mediaId: value.media.id,
      });
    }
  }

  return events;
}
