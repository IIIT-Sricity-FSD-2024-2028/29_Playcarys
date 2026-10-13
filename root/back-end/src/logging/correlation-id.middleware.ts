// ============================================================
//  Correlation-ID / Request-ID middleware.
//
//  Stamps every inbound HTTP request with a UUID so that a single
//  request can be traced across access-*.log and error-*.log even
//  when many requests are in-flight concurrently.
//
//  Two sources in priority order:
//    1. An `X-Request-Id` header supplied by the caller (a load-balancer,
//       an API client, or a test harness). Honouring it means the caller's
//       own trace-ID propagates end-to-end.
//    2. A fresh crypto.randomUUID() when the caller did not supply one.
//
//  The chosen ID is echoed back as `X-Request-Id` on the response so
//  that both sides of the conversation always share the same reference.
//  It is also written onto `req` as `req.requestId` so that
//  RequestLoggerMiddleware and AllExceptionsFilter can include it in
//  their log lines without repeating the header-parsing logic.
//
//  Registered in AppModule.configure() as the FIRST middleware in the
//  global chain (before SecurityHeadersMiddleware and
//  RequestLoggerMiddleware) so the ID is available to everything that
//  follows.
// ============================================================

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Honour a caller-supplied ID, or mint a fresh one.
    const id =
      (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim()
        ? req.headers['x-request-id'].trim()
        : null) ?? crypto.randomUUID();

    // Attach to req so downstream middleware and filters can reference it.
    (req as any).requestId = id;

    // Echo it back on the response — essential for correlating client
    // error reports with server log entries.
    res.setHeader('X-Request-Id', id);

    next();
  }
}
