export interface ZipEntry {
    path: string;
    contents: Buffer;
}
export declare const ZIP_LIMITS: {
    maxEntries: number;
    maxTotalUncompressed: number;
    maxCompressionRatio: number;
    ratioCheckAppliesOver: number;
};
export declare class ZipError extends Error {
}
export declare function readZip(buf: Buffer): ZipEntry[];
export declare function normaliseEntryPath(rawName: string): string;
