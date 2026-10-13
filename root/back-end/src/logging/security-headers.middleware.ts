// ============================================================
//  Global security-headers middleware.
//
//  Deliberately NOT using a Content-Security-Policy or Strict-Transport-
//  Security header: a CSP strict enough to matter would break Swagger UI's
//  inline scripts/styles (served from /api/docs on this same app) and the
//  Socket.IO client handshake, and HSTS is actively wrong on the plain-HTTP
//  local/LAN/tunnel setup run.bat uses. The headers below are the safe,
//  universally-compatible subset: no dependency on request content, so
//  Swagger, the game-hosting routes, and file uploads all pass through
//  completely unaffected — this middleware never reads or rewrites the body.
//
//  X-Frame-Options is SAMEORIGIN, not DENY: DENY would block this API's own
//  Swagger page from ever being framed by tooling that does that, for no
//  security benefit here (the API serves JSON, not game pages — games are
//  served by the front-end's own static server, untouched by this file).
// ============================================================

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    next();
  }
}
