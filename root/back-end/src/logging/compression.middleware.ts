// ============================================================
//  Response-compression middleware.
//
//  Compresses outbound responses using Node's built-in `zlib` module —
//  no new npm dependency required. Gzip is preferred; deflate is used
//  as a fallback when the caller lists it but not gzip.
//
//  Only compresses when ALL of the following are true:
//    1. The caller advertises gzip or deflate in Accept-Encoding.
//    2. The response Content-Type is a text/JSON/JS type
//       (binary game bundles and ZIPs are already compressed and would
//       grow, not shrink, if re-compressed).
//    3. The response body is at least 1 KB — below that, the gzip
//       frame overhead can exceed the savings.
//
//  Works by wrapping Express's `res.send` with a thin shim that checks
//  the above conditions after the controller has set the Content-Type
//  and body, then synchronously compresses the buffer before the
//  original send is called. Synchronous zlib is appropriate here:
//  these payloads are at most a few hundred KB and the call is already
//  inside an async I/O callback, so blocking for a few milliseconds is
//  not a concern.
//
//  Registered in AppModule.configure() as part of the global chain.
// ============================================================

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as zlib from 'zlib';

/** Minimum response size (bytes) worth compressing. */
const MIN_COMPRESS_BYTES = 1_024;

/**
 * Content-Type patterns that are worth compressing.
 * Binary types (application/zip, application/octet-stream, image/*,
 * video/*, audio/*) are excluded — they are already compressed and
 * re-compressing would waste CPU while increasing size.
 */
const COMPRESSIBLE_TYPE = /^(text\/|application\/(json|javascript|xml|x-www-form-urlencoded))/i;

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const acceptEncoding = String(req.headers['accept-encoding'] ?? '');
    const useGzip    = acceptEncoding.includes('gzip');
    const useDeflate = !useGzip && acceptEncoding.includes('deflate');

    // No usable encoding advertised — pass through unchanged.
    if (!useGzip && !useDeflate) {
      next();
      return;
    }

    const encoding  = useGzip ? 'gzip' : 'deflate';
    const _send     = res.send.bind(res);
    let alreadyRan  = false; // guard against the shim calling itself

    (res as any).send = function (body?: unknown): Response {
      // Prevent re-entry (e.g. if _send internally calls res.send).
      if (alreadyRan) return _send(body);

      // Convert body to a Buffer so we can measure size and compress.
      let buf: Buffer | null = null;
      if (typeof body === 'string') {
        buf = Buffer.from(body, 'utf8');
      } else if (Buffer.isBuffer(body)) {
        buf = body;
      }
      // Objects should have been serialised by res.json() before reaching
      // res.send(), so we only expect string or Buffer here. If it is
      // something else, fall through without compression.

      if (!buf || buf.length < MIN_COMPRESS_BYTES) return _send(body);

      const ct = String(res.getHeader('content-type') ?? '');
      if (!COMPRESSIBLE_TYPE.test(ct)) return _send(body);

      try {
        const compressed = useGzip ? zlib.gzipSync(buf) : zlib.deflateSync(buf);
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Content-Length', compressed.length);
        res.removeHeader('Transfer-Encoding');
        alreadyRan = true;
        return _send(compressed);
      } catch {
        // Compression failure must never kill the response — serve
        // uncompressed rather than surfacing a 500.
        alreadyRan = true;
        return _send(body);
      }
    };

    next();
  }
}
