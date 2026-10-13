// ============================================================
//  Global error-handling filter — every thrown error, from every
//  controller, passes through here exactly once (registered in main.ts via
//  app.useGlobalFilters). Handles both deliberate HttpExceptions (403, 404,
//  the 400s ValidationPipe throws, ...) and unexpected crashes (500).
//
//  Two jobs:
//   1. Always answer the CALLER with the same shape:
//        { statusCode, message, timestamp, path }
//      — never a stack trace, never an internal error object, regardless of
//      what actually threw.
//   2. Record the FULL detail — method, path, status, message, and (for
//      unexpected 500s) the stack trace — to logs/error-YYYY-MM-DD.log via
//      FileLoggerService. That detail never leaves the server.
// ============================================================

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileLoggerService } from './file-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: FileLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage = isHttp ? exception.getResponse() : (exception as Error)?.message;
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : (rawMessage as { message?: string | string[] })?.message ?? 'Internal server error';

    const timestamp = new Date().toISOString();
    const path = request?.originalUrl ?? request?.url ?? 'unknown';
    // Correlation ID set by CorrelationIdMiddleware — allows this error
    // entry in error-*.log to be matched against the access-*.log line
    // for the same request when debugging concurrent traffic.
    const reqId = (request as any)?.requestId ?? null;

    // Full detail to the file only — never to the response.
    const stack = exception instanceof Error ? exception.stack : undefined;
    const detail = [
      `[${timestamp}]${reqId ? ` [${reqId}]` : ''} ${status} ${request?.method ?? '-'} ${path}`,
      `message: ${JSON.stringify(message)}`,
      stack ? `stack:\n${stack}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    this.logger.error(detail);
    if (!isHttp) console.error(`[${timestamp}] Unhandled exception on ${path}:`, exception);

    // Exactly this shape to the caller — no stack, no internal fields.
    response.status(status).json({
      statusCode: status,
      message,
      timestamp,
      path,
      ...(reqId ? { requestId: reqId } : {}),
    });
  }
}
