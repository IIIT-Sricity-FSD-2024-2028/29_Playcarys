// ============================================================
//  Wraps every piece built for the eval's middleware / log-management
//  requirements: file-backed dated logging, the global request logger, the
//  scoped audit logger, global security headers, the scoped rate limiter,
//  and the global exception filter. @Global so main.ts can pull
//  AllExceptionsFilter and FileLoggerService out of the app's DI container
//  without re-importing this module, and so every other module's
//  MiddlewareConsumer.apply(...) calls resolve the same shared instances.
// ============================================================

import { Global, Module } from '@nestjs/common';
import { FileLoggerService } from './file-logger.service';
import { RequestLoggerMiddleware } from './request-logger.middleware';
import { AuditMiddleware } from './audit.middleware';
import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { SanitizeInterceptor } from './sanitize.interceptor';
import { UserRateLimitMiddleware } from './user-rate-limit.middleware';
import { TimeoutInterceptor } from './timeout.interceptor';
import { CompressionMiddleware } from './compression.middleware';
import { IdempotencyMiddleware } from './idempotency.middleware';

@Global()
@Module({
  providers: [
    FileLoggerService,
    RequestLoggerMiddleware,
    AuditMiddleware,
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    AllExceptionsFilter,
    // New — added for high/medium priority gaps:
    CorrelationIdMiddleware,
    SanitizeInterceptor,
    UserRateLimitMiddleware,
    TimeoutInterceptor,
    CompressionMiddleware,
    IdempotencyMiddleware,
  ],
  exports: [
    FileLoggerService,
    RequestLoggerMiddleware,
    AuditMiddleware,
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    AllExceptionsFilter,
    CorrelationIdMiddleware,
    SanitizeInterceptor,
    UserRateLimitMiddleware,
    TimeoutInterceptor,
    CompressionMiddleware,
    IdempotencyMiddleware,
  ],
})
export class LoggingModule {}

