type Emitter = {
    emit: (event: string, ...args: unknown[]) => unknown;
};
export declare function registerBroadcastServer(s: Emitter): void;
export declare function broadcastStateChanged(delayMs?: number): void;
export {};
