export declare const MAX_BUNDLE_BYTES: number;
export interface BundleResult {
    slug: string;
    playPath: string;
    entryFile: string;
    fileCount: number;
    totalBytes: number;
}
interface ManifestEntry {
    game_id: number;
    slug: string;
    play_path: string;
    bundle_size: number;
    bundle_uploaded_at: string;
}
export declare class BundleService {
    private readonly logger;
    getGamesRoot(): string;
    buildSlug(gameName: string, gameId: number): string;
    install(buffer: Buffer, gameName: string, gameId: number): BundleResult;
    uninstall(slug: string): void;
    private manifestPath;
    readManifest(): ManifestEntry[];
    private writeManifest;
    private recordInManifest;
    rehydrate(games: {
        game_id: number;
        [k: string]: any;
    }[]): number;
    private stripWrapperFolder;
    private assertSafe;
    private isInside;
}
export {};
