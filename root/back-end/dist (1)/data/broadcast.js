"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBroadcastServer = registerBroadcastServer;
exports.broadcastStateChanged = broadcastStateChanged;
let server = null;
function registerBroadcastServer(s) {
    server = s;
}
let pending = null;
function broadcastStateChanged(delayMs = 150) {
    if (!server || pending)
        return;
    pending = setTimeout(() => {
        pending = null;
        try {
            server?.emit('global_db_update_received');
        }
        catch {
        }
    }, delayMs);
    if (typeof pending.unref === 'function')
        pending.unref();
}
//# sourceMappingURL=broadcast.js.map