// ============================================================
//  Global logging middleware.
//
//  Registered in AppModule.configure() via MiddlewareConsumer against
//  every route ('*') — see the router-level AuditMiddleware in this same
//  folder for the CONTRAST: that one is deliberately scoped to a handful
//  of staff-sensitive routes, this one is deliberately everywhere.
//
//  Logs: timestamp, method, path, status code, duration, client IP.
//  Never logs: the request body, headers (so no Authorization/role/cookie
//  ever reaches a line here), the response body, or the QUERY STRING —
//  req.path (not req.originalUrl) is used deliberately, since a query string
//  can carry a reset token, a search term, or anything else a caller put on
//  the URL. That is enough to satisfy "record ... status code, duration, and
//  client IP" while keeping sensitive values out of the log files by
//  construction, not by filtering.
// ============================================================

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { FileLoggerService } from './file-logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: FileLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    // CorrelationIdMiddleware (registered before this in the global chain)
    // attaches requestId to req. Read it here so the access log and the
    // error log share the same key for every request.
    const reqId = (req as any).requestId ?? '-';

    res.on('finish', () => {
      const ms = Date.now() - start;
      const ip = req.ip ?? req.socket?.remoteAddress ?? '-';
      // req.path, not req.originalUrl — the latter includes the query
      // string, which can carry a reset token, a search term, anything.
      const line = `[${new Date().toISOString()}] [${reqId}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms - ${ip}`;
      this.logger.log(line);
      console.log(line); // also visible live under npm run start:dev / run.bat's backend.log
    });

    next();
  }
}
