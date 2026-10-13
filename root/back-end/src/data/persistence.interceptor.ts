// ============================================================
//  Persist after every successful write request.
//
//  Applied globally rather than called from each handler: there are
//  37 mutating endpoints across 12 modules, and any one of them
//  forgotten would silently lose data on the next restart — the
//  exact failure this is meant to end. One interceptor cannot be
//  forgotten by a future endpoint.
// ============================================================

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { scheduleSave } from './persistence';
import { broadcastStateChanged } from './broadcast';

/** Verbs that can change state. Everything else is read-only. */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Endpoints that write, but write nothing another client needs to be told about.
 *
 * These are liveness pings. Every signed-in tab posts a heartbeat on a timer, so
 * broadcasting them is not merely wasteful — it is a FEEDBACK LOOP:
 *
 *   heartbeat -> broadcast -> every client pulls /db-export
 *             -> pull dispatches 'playcarys:dbupdate'
 *             -> the listener calls Auth.checkSessionOwnership()
 *             -> heartbeat ...
 *
 * Observed immediately after the broadcast was first added: a flood of
 * POST /auth/heartbeat that exhausted the browser's connection pool and turned
 * into net::ERR_INSUFFICIENT_RESOURCES on ordinary page assets.
 *
 * They still SAVE (a heartbeat updates lastSeen, which is worth persisting);
 * they just do not wake anyone up. Presence has its own slower refresh.
 */
const SILENT_PATHS = [/\/auth\/heartbeat$/, /\/auth\/release$/];

@Injectable()
export class PersistenceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only HTTP requests carry a method; websocket events are handled by the
    // gateway, which mutates through the same services and will be picked up
    // by the next HTTP write or the shutdown flush.
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const method = req?.method;
    if (!MUTATING.has(String(method || '').toUpperCase())) return next.handle();

    const path = String(req?.originalUrl || req?.url || '').split('?')[0];
    const silent = SILENT_PATHS.some((re) => re.test(path));

    // tap's next callback runs only on success, so a rejected request
    // (validation error, 403, conflict) never triggers a write.
    //
    // The broadcast rides along here for the same reason the save does: there
    // are 37 mutating endpoints, and one added later would otherwise forget to
    // announce itself. Before this, a REST write changed the server and told no
    // client, so open tabs kept showing stale data until someone reloaded.
    return next.handle().pipe(
      tap(() => {
        scheduleSave();
        if (!silent) broadcastStateChanged();
      }),
    );
  }
}
