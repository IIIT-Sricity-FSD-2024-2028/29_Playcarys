// ============================================================
//  Server-side change broadcaster.
//
//  THE BUG THIS EXISTS FOR
//  -----------------------
//  Clients learn that data changed in exactly one way: a browser calls
//  DB.save(), which emits 'global_db_update' on its socket, and the gateway
//  relays 'global_db_update_received' to everyone else.
//
//  That means a change is only ever announced if a BROWSER made it. Every
//  REST write - an admin approving a game, a notification created through
//  POST /notifications, a moderator lifting a ban, a game webhook - changed
//  the server and told nobody. Reproduced 2026-08-14: a friend request
//  created via the API never reached an open, socket-connected tab.
//
//  The client-side poll that would have caught it had disabled itself on the
//  grounds that "the socket covers us". Both halves are fixed; this is the
//  server half.
//
//  Deliberately NOT a Nest provider: the PersistenceInterceptor is created
//  with `new` in main.ts (it is a global interceptor with no DI container
//  behind it), so it cannot inject the gateway. A module-level reference the
//  gateway publishes on init is the smallest thing that works for both.
// ============================================================

type Emitter = { emit: (event: string, ...args: unknown[]) => unknown };

let server: Emitter | null = null;

/** Called once by GameGateway when socket.io is ready. */
export function registerBroadcastServer(s: Emitter): void {
  server = s;
}

/**
 * Tell every connected client that server state moved.
 *
 * Sends the SAME event the gateway already relays between browsers, so every
 * existing listener picks it up with no client change: utils.js subscribes to
 * 'global_db_update_received' and pulls a fresh /db-export.
 *
 * Coalesced on a short timer because one request can trigger several writes,
 * and a burst of identical wake-ups would have every client re-fetching the
 * whole database several times over.
 */
let pending: NodeJS.Timeout | null = null;

export function broadcastStateChanged(delayMs = 150): void {
  if (!server || pending) return;
  pending = setTimeout(() => {
    pending = null;
    try {
      server?.emit('global_db_update_received');
    } catch {
      // A dead socket server must never break the request that triggered this.
    }
  }, delayMs);
  if (typeof pending.unref === 'function') pending.unref();
}
