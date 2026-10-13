// ============================================================
//  Per-user (authenticated) rate limiter.
//
//  Complements RateLimitMiddleware, which keys on IP and protects
//  anonymous brute-force targets (login, register, password reset).
//  That limiter does nothing once a user is authenticated, because an
//  authenticated caller can reach write-heavy routes from many IPs or
//  devices simultaneously.
//
//  This limiter keys on `user_id` extracted from the signed JWT — a
//  value the server minted, not the caller. If no valid token is
//  present (which should not happen on authenticated routes, but can
//  during tests or with a stale token), it falls back silently to IP
//  so the request still gets counted somewhere.
//
//  Window: 60 s / 20 requests — more generous than the anonymous
//  limiter (10/60 s) because these are normal authenticated-traffic
//  routes, not brute-force targets. The limit is still tight enough
//  to stop a single account from spam-submitting reports or tournament
//  registrations in a loop.
//
//  Registered in AppModule.configure() against only the write-heavy
//  authenticated routes:
//    POST /reports
//    POST /tournaments/:id/register
//    POST /notifications
//    POST /moderator-actions/act-on-report
//    POST /moderator-actions/handle-violation
// ============================================================

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { bearerFrom, verifyToken } from '../auth/token.util';

const WINDOW_MS             = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;   // per user per route

interface Bucket {
  count: number;
  windowStart: number;
}

@Injectable()
export class UserRateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, Bucket>();

  use(req: Request, res: Response, next: NextFunction): void {
    const payload = verifyToken(bearerFrom(req.headers['authorization']));

    // Key on user_id when authenticated; fall back to IP when not.
    const identity = payload
      ? `user:${payload.sub}`
      : `ip:${req.ip ?? 'unknown'}`;
    const key = `${identity}:${req.baseUrl}${req.path}`;

    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStart > WINDOW_MS) {
      this.buckets.set(key, { count: 1, windowStart: now });
    } else {
      bucket.count += 1;
      if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
        // A 429 without Retry-After leaves the caller guessing, so clients
        // typically retry at once and stay blocked. This is a fixed window,
        // so the reopening time is known exactly: whatever remains of it,
        // rounded up to whole seconds (RFC 9110 requires an integer).
        const retryAfterS = Math.max(1, Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000));
        res.setHeader('Retry-After', String(retryAfterS));
        res.status(429).json({
          statusCode: 429,
          message: 'Too many requests — please slow down and try again.',
          retry_after_seconds: retryAfterS,
          path: req.originalUrl,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Prune stale entries to prevent unbounded memory growth.
    if (this.buckets.size > 5_000) {
      for (const [k, b] of this.buckets) {
        if (now - b.windowStart > WINDOW_MS) this.buckets.delete(k);
      }
    }

    next();
  }
}
