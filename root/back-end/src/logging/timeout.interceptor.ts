// ============================================================
//  Global request-timeout interceptor.
//
//  Guards against hung requests — a slow bundle-scan, a stalled
//  socket broadcast, or a deep recursive query — that would otherwise
//  hold a slot in Node's event loop indefinitely.
//
//  Mechanism: wraps every controller's Observable with RxJS
//  timeout(TIMEOUT_MS). If the handler has not produced a value
//  within that window, RxJS emits a TimeoutError which is caught
//  here and re-thrown as a NestJS RequestTimeoutException (408).
//  The global AllExceptionsFilter catches it, logs it, and returns
//  the standard { statusCode, message, timestamp, path } shape to
//  the caller.
//
//  Skips WebSocket contexts: gateway event handlers are long-lived
//  bidirectional channels, not request-response pairs, so a hard
//  30-second cut-off would break live chess and matchmaking.
//
//  Registered in main.ts as the FIRST global interceptor (outermost
//  wrapper) so the timeout budget covers the sanitize step,
//  the controller, and the persistence flush together.
// ============================================================

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/** Hard ceiling for any single HTTP request. */
const TIMEOUT_MS = 30_000;

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // WebSocket and RPC contexts are long-lived — do not timeout them.
    if (context.getType() !== 'http') return next.handle();

    return next.handle().pipe(
      timeout(TIMEOUT_MS),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException(
            `Request timed out — the server did not produce a response within ${TIMEOUT_MS / 1000} seconds.`,
          );
        }
        throw err;
      }),
    );
  }
}
