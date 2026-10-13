// ============================================================
//  Global HTML-sanitization interceptor.
//
//  Removes HTML tags from every string field in the request body
//  before it reaches any controller or repository. This is a
//  stored-XSS guard: even if the frontend renders a field as HTML
//  later, it will never find a <script> or <img onerror="..."> tag
//  because those were stripped here.
//
//  Design choices:
//    - Strip tags (remove <...>) rather than HTML-escape them.
//      Escaping (&lt;script&gt;) is lossless but the store is JSON,
//      not HTML — the frontend is responsible for context-appropriate
//      escaping when rendering, not the API.
//    - Recurses into nested objects and arrays so deeply nested fields
//      (e.g. a notification reply's `msg` inside an array of replies)
//      are also cleaned.
//    - Skips GET / HEAD / OPTIONS — those have no request body.
//    - Skips non-HTTP contexts (WebSocket gateway events are not body-
//      parsed the same way and are handled by their own validators).
//    - Skips the db-import and game-bundle paths: db-import replays a
//      full snapshot that has already been sanitized at write time, and
//      the bundle route receives binary zip data, not JSON text fields.
//
//  Registered in main.ts as the SECOND global interceptor
//  (after TimeoutInterceptor, before PersistenceInterceptor), so it
//  runs on every mutating request regardless of which module handles it.
// ============================================================

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/** Methods that carry a request body worth sanitizing. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Paths to skip entirely.  db-import replays a full snapshot; the game
 * bundle route receives a zip, not user-generated text.
 */
const SKIP_PATH_RE = /\/(db-import|bundle)($|\/|\?)/i;

/**
 * Recursively walk `value` and strip HTML tags from every string leaf.
 * Numbers, booleans, null, and Buffer instances pass through untouched.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove any <tag ...> or </tag> construct.
    return value.replace(/<[^>]*>/g, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object' && !Buffer.isBuffer(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(v);
    }
    return out;
  }
  return value;
}

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request & { body?: unknown; originalUrl?: string; url?: string }>();
    const method = String((req as any).method || '').toUpperCase();

    if (!MUTATING_METHODS.has(method)) return next.handle();

    const path = String((req as any).originalUrl ?? (req as any).url ?? '').split('?')[0];
    if (SKIP_PATH_RE.test(path)) return next.handle();

    if ((req as any).body && typeof (req as any).body === 'object') {
      (req as any).body = sanitizeValue((req as any).body);
    }

    return next.handle();
  }
}
