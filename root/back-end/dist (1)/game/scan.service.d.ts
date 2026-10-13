export declare const SCANNER_VERSION = "1.0.0";
export type ScanSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ScanVerdict = 'pass' | 'warn' | 'fail';
export interface ScanFinding {
    code: string;
    severity: ScanSeverity;
    message: string;
    file: string;
    line: number;
    snippet: string;
}
export interface ScanFileEntry {
    path: string;
    bytes: number;
    sha256: string;
}
export interface ScanReport {
    scanner_version: string;
    scanned_at: string;
    verdict: ScanVerdict;
    bundle_hash: string;
    file_count: number;
    total_bytes: number;
    findings: ScanFinding[];
    manifest: ScanFileEntry[];
    external_origins: string[];
    summary: Record<ScanSeverity, number>;
    truncated?: string;
}
export declare class ScanService {
    private readonly logger;
    scanDirectory(root: string): ScanReport;
    private verdictFor;
    private bundleHash;
    private walk;
    private isText;
    private checkFileName;
    private checkMagicBytes;
    private applyRules;
    private collectOrigins;
    private lineIndex;
    private lineAt;
    private lineText;
    private finding;
    private rank;
}
