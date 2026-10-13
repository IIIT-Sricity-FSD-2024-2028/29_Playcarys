export declare function warnIfCredentialsMissing(): void;
export declare function rememberPassthrough(body: Record<string, unknown>): void;
export declare function snapshot(): Record<string, unknown>;
export declare function saveNow(): void;
export declare function scheduleSave(delayMs?: number): void;
export declare function isPending(): boolean;
export declare function lastWriteError(): string | null;
export declare function installShutdownFlush(): void;
