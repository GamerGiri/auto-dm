/**
 * Instagram OAuth Token Management
 *
 * Handles short-lived → long-lived token exchange,
 * token refresh, and AES-256-GCM encryption for storage.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const INSTAGRAM_OAUTH_URL = "https://api.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";

// ─── OAuth URL Builder ──────────────────────────────────────────────────────────

/**
 * Build the Instagram OAuth authorization URL.
 */
export function getAuthorizationUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    scope:
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments",
    response_type: "code",
  });

  return `${INSTAGRAM_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for a short-lived access token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Token exchange failed: ${error.error_message || JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    userId: String(data.user_id),
  };
}

// ─── Token Encryption (AES-256-GCM) ────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string containing: IV + AuthTag + CipherText
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: base64(iv + authTag + ciphertext)
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, "hex"),
  ]);

  return combined.toString("base64");
}

/**
 * Decrypt a token encrypted with encryptToken().
 */
export function decryptToken(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}
