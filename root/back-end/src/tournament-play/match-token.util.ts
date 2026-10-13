import * as crypto from 'crypto';

/**
 * The rendezvous key two players carry into a publisher's game.
 *
 * The platform does NOT run the netcode for a publisher's multiplayer game and
 * cannot — that was the whole lesson of removing rooms. What it can do is hand
 * both players the same signed token and let the publisher's own matchmaker
 * group anyone presenting it. That is the entire integration on their side.
 *
 * Signed rather than merely generated, because the token decides who is in
 * which bracket match. An unsigned one is a URL parameter, and a player who can
 * edit a URL parameter can enter a match they were never drawn into.
 */
export interface MatchTokenPayload {
  tournament_id: number | string;
  match_id: string;
  player_ids: (number | string)[];
  game_id: number;
  expires_at: number; // epoch ms
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(body: string, secret: string): string {
  return b64url(crypto.createHmac('sha256', secret).update(body).digest());
}

/** `<payload>.<signature>` — compact enough to sit in a query string. */
export function issueMatchToken(payload: MatchTokenPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  payload?: MatchTokenPayload;
}

export function verifyMatchToken(token: string, secret: string): VerifyResult {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'Malformed token.' };
  }
  const [body, sig] = token.split('.');
  const expected = sign(body, secret);

  // timingSafeEqual, not ===. Comparing signatures with a normal string compare
  // leaks how many leading characters were right, which is enough to forge one
  // byte at a time given enough attempts.
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'Signature does not match.' };
  }

  let payload: MatchTokenPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8'));
  } catch {
    return { ok: false, reason: 'Token payload is not readable.' };
  }

  if (!payload.expires_at || Date.now() > payload.expires_at) {
    return { ok: false, reason: 'Token has expired.' };
  }
  return { ok: true, payload };
}

/**
 * Verify a result posted by a publisher's SERVER.
 *
 * They sign the raw JSON body; we recompute over the same bytes. Signing the
 * body rather than a few fields is what stops a replay with the winner swapped.
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = sign(rawBody, secret);
  const a = Buffer.from(signature.replace(/^sha256=/, ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** A secret to hand a publisher at publish time. */
export function newWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
