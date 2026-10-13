// ============================================================
//  Scoped in-memory rate limiter.
//
//  Deliberately NOT global — registered in AppModule.configure() against
//  only login, register, forgot-password, reset-password, and the game
//  bundle upload route (see app.module.ts). Everywhere else (game browsing,
//  the frontend's poll/heartbeat traffic) is left alone: this project's own
//  history includes a heartbeat-broadcast feedback loop that flooded the
//  connection pool, so a limiter tight enough to matter on brute-forceable
//  routes would misfire constantly if applied to normal polling traffic.
//
//  No dependency (express-rate-limit etc.) — a fixed window counter over a
//  Map is the whole implementation, well within what Node's stdlib can do
//  safely for a single-process app like this one.
//
//  Fixed window, not sliding: each key's window resets entirely from its
//  own first request, so (unlike a sliding-window/sliding-log limiter) a
//  burst that lands across two windows — e.g. 10 requests just before a
//  window boundary and 10 more just after — can momentarily let through
//  close to double the nominal limit. Acceptable here: this is a
//  brute-force/spam guard, not a precise quota, and the simplicity is worth
//  it for a project this size.
// ============================================================

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10; // brute-force/spam guard, not a normal-traffic limit

interface Bucket {
  count: number;
  windowStart: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, Bucket>();

  use(req: Request, res: Response, next: NextFunction): void {
    const key = `${req.ip ?? 'unknown'}:${req.baseUrl}${req.path}`;
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
          message: 'Too many requests — please wait a moment and try again.',
          retry_after_seconds: retryAfterS,
          path: req.originalUrl,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Forget quiet entries so this map can't grow forever on a long-running process.
    if (this.buckets.size > 2000) {
      for (const [k, b] of this.buckets) {
        if (now - b.windowStart > WINDOW_MS) this.buckets.delete(k);
      }
    }

    next();
  }
}
