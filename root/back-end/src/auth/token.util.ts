// ============================================================
//  Signed session tokens.
//
//  Authorisation on this platform was a header the caller wrote
//  themselves: `role: superuser` granted everything, to anyone.
//  Verified by escalating a player account to superuser twice —
//  once through PATCH /users/:id with a forged header, once
//  through the unauthenticated db-import.
//
//  A token fixes that by making the role something the SERVER
//  said, not something the client claimed. It is signed with
//  HMAC-SHA256 using Node's built-in crypto — no jsonwebtoken,
//  no new dependency, same stack.
//
//  Format:  base64url(payload) "." base64url(HMAC-SHA256)
//  This is a JWT in spirit but deliberately not one: writing the
//  three-segment JWT format by hand invites someone to trust a
//  library-parsed `alg` field later. There is one algorithm here
//  and it is not negotiable by the token.
// ============================================================

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface TokenPayload {
  /** user_id */
  sub: number;
  role_id: number;
  role: string;
  /** issued at, epoch ms */
  iat: number;
  /** expires at, epoch ms */
  exp: number;
}

/** How long a sign-in stays valid. */
export const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * The signing key.
 *
 * AUTH_SECRET wins when set. Otherwise a random key is generated once and kept
 * beside the backend so that a restart does not silently invalidate everyone's
 * session — a fresh key each boot would look exactly like "the app randomly
 * logs me out". Never falls back to a hardcoded default: a shipped constant is
 * the same as no signature at all.
 */
function loadSecret(): Buffer {
  if (process.env.AUTH_SECRET) return Buffer.from(process.env.AUTH_SECRET, 'utf8');

  const file = path.join(__dirname, '..', '..', '.auth-secret');
  try {
    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf8').trim();
      if (existing.length >= 32) return Buffer.from(existing, 'utf8');
    }
  } catch { /* fall through and regenerate */ }

  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.writeFileSync(file, generated, { encoding: 'utf8', mode: 0o600 });
  } catch (err) {
    console.warn(
      '[auth] Could not persist the signing key; sessions will not survive a restart:',
      (err as Error).message,
    );
  }
  return Buffer.from(generated, 'utf8');
}

const SECRET = loadSecret();

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64');
}

function signature(body: string): string {
  return b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
}

/** Issue a token for an authenticated user. */
export function signToken(user: { user_id: number; role_id: number }, roleName: string): string {
  const now = Date.now();
  const payload: TokenPayload = {
    sub: user.user_id,
    role_id: user.role_id,
    role: roleName,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signature(body)}`;
}

/**
 * Validate a token and return its payload, or null.
 *
 * Returns null rather than throwing for every failure mode — malformed,
 * mis-signed, expired — so callers cannot accidentally distinguish them and
 * leak which part was wrong.
 */
export function verifyToken(token: string | undefined | null): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = signature(body);

  // Constant-time compare. timingSafeEqual throws on length mismatch, which
  // would itself be a timing signal, so the lengths are checked first.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as TokenPayload;
    if (typeof payload?.exp !== 'number' || Date.now() > payload.exp) return null;
    if (typeof payload.sub !== 'number' || typeof payload.role !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

/** Pull a bearer token out of an Authorization header. */
export function bearerFrom(headerValue: unknown): string | null {
  if (typeof headerValue !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match ? match[1].trim() : null;
}
