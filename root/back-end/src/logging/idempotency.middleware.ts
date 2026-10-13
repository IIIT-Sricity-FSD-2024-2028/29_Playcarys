// ============================================================
//  Idempotency-Key middleware.
//
//  Protects mutation-sensitive POSTs from duplicate submissions caused
//  by network retries, double-clicks, or browser back-button replays.
//  PersistenceInterceptor writes to disk on every successful mutation,
//  so a duplicate POST without this guard creates two tournament
//  registrations, two moderator actions, or two bundle uploads.
//
//  Protocol (industry-standard, compatible with Stripe / PayPal):
//    - The caller attaches a header:  Idempotency-Key: <uuid>
//    - First request with that key executes normally. The response
//      (status + body) is cached for 5 minutes.
//    - Any repeat within the 5-minute window is answered immediately
//      from the cache — the handler never fires, so the DB write
//      never happens.
//    - After 5 minutes the key expires. A fresh request with the same
//      key is treated as a new submission.
//    - Requests without an Idempotency-Key pass through untouched.
//
//  Only caches 2xx responses. A 4xx or 5xx means the first attempt
//  failed, so the caller should fix the problem and retry (retrying a
//  400 with the same key should re-run validation and fail cleanly).
//
//  Registered in AppModule.configure() against only the
//  idempotency-sensitive routes:
//    POST /tournaments/:id/register
//    POST /moderator-actions/act-on-report
//    POST /moderator-actions/handle-violation
//    POST /games/:id/bundle
// ============================================================

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const TTL_MS         = 5 * 60 * 1_000; // 5 minutes
const MAX_CACHE_SIZE = 5_000;           // entries before pruning

interface CachedEntry {
  status: number;
  body: unknown;
  cachedAt: number;
}

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly cache = new Map<string, CachedEntry>();

  use(req: Request, res: Response, next: NextFunction): void {
    const rawKey = req.headers['idempotency-key'];
    const key = typeof rawKey === 'string' ? rawKey.trim() : null;

    // No key supplied — behave normally.
    if (!key) {
      next();
      return;
    }

    const now = Date.now();
    const cached = this.cache.get(key);

    // Cache hit within TTL — replay the stored response immediately.
    if (cached && now - cached.cachedAt < TTL_MS) {
      res.status(cached.status).json(cached.body);
      return;
    }

    // Cache miss or expired — intercept res.json to save the response.
    const _json = res.json.bind(res);
    res.json = (body: unknown): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        this.cache.set(key, { status: res.statusCode, body, cachedAt: Date.now() });

        // Prune when the cache grows large to avoid unbounded memory use.
        if (this.cache.size > MAX_CACHE_SIZE) {
          const cutoff = Date.now() - TTL_MS;
          for (const [k, entry] of this.cache) {
            if (entry.cachedAt < cutoff) this.cache.delete(k);
          }
        }
      }
      return _json(body);
    };

    next();
  }
}
