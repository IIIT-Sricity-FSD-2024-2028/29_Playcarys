// ============================================================
//  Static security scan for publisher-submitted game bundles.
//
//  bundle.service.ts already refuses archives that are malformed
//  as ARCHIVES — zip slip, zip bombs, executables, server config
//  files. That is a structural gate, and it says nothing at all
//  about the thing a bundle is actually made of: .html and .js,
//  which are allowed by definition because they are the game.
//
//  This is the gate for that content. It never decides on its own
//  whether a game ships — it produces evidence an admin reads:
//  what the build touches, where, and on which line. Only the
//  unambiguous cases (a bundle reading the platform session key,
//  a miner, a script-bearing SVG) are hard failures.
//
//  It also fingerprints every file, which is what lets approval
//  be bound to one exact build instead of to a game's name.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const SCANNER_VERSION = '1.0.0';

export type ScanSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ScanVerdict = 'pass' | 'warn' | 'fail';

export interface ScanFinding {
  /** Stable rule id, e.g. "PC-SESSION-READ". Safe to reference in review notes. */
  code: string;
  severity: ScanSeverity;
  /** What was found, phrased for an admin who is not a security engineer. */
  message: string;
  file: string;
  line: number;
  /** The matching source line, trimmed and truncated. */
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
  /** Fingerprint of the whole build. Approval is bound to this value. */
  bundle_hash: string;
  file_count: number;
  total_bytes: number;
  findings: ScanFinding[];
  manifest: ScanFileEntry[];
  /** Every third-party origin the build references. */
  external_origins: string[];
  summary: Record<ScanSeverity, number>;
  /** Set when scanning was cut short, so a clean report is never mistaken for a complete one. */
  truncated?: string;
}

/** Extensions we read as source. Anything else is hashed but not parsed. */
const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.js', '.mjs', '.cjs', '.jsx', '.ts',
  '.json', '.css', '.svg', '.xml', '.txt', '.map',
]);

/** Per-file read cap. A 40 MB asset blob is not worth regexing. */
const MAX_SCAN_BYTES_PER_FILE = 2 * 1024 * 1024;
/** At most this many hits per rule per file — one bad loop shouldn't produce 9000 findings. */
const MAX_HITS_PER_RULE_PER_FILE = 3;
const MAX_FINDINGS = 400;
const SNIPPET_LIMIT = 180;

interface Rule {
  code: string;
  severity: ScanSeverity;
  message: string;
  pattern: RegExp;
  /** Restrict to these extensions; omit to run against all source files. */
  only?: string[];
}

/**
 * The rule table. Ordered roughly by how damning a hit is.
 *
 * Severity is a claim about CERTAINTY, not about how scary the API sounds.
 * localStorage is `high` because a legitimate game saves its progress there
 * and we cannot tell the two apart from a regex — an admin has to look.
 * Reading our literal session key is `critical` because nothing legitimate
 * ever does it.
 */
const RULES: Rule[] = [
  // ── Unambiguous. These fail the scan outright. ──────────────
  {
    code: 'PC-SESSION-READ',
    severity: 'critical',
    message:
      'Reads the PlayCarys session key. A game has no reason to touch platform credentials — this is session theft.',
    pattern: /playcarys_session|pc_logout_reason|playcarys_db_store/gi,
  },
  {
    code: 'PC-CRYPTOMINER',
    severity: 'critical',
    message: 'Contains cryptocurrency mining code, which silently spends the player\'s CPU.',
    pattern: /coinhive|cryptonight|cryptoloot|webminepool|deepminer|jsecoin|minero\.cc/gi,
  },
  {
    code: 'PC-SVG-SCRIPT',
    severity: 'critical',
    message: 'SVG contains executable script. An image is served as an image but this one runs code.',
    pattern: /<script|javascript:|\son(?:load|error|click|mouseover)\s*=/gi,
    only: ['.svg'],
  },
  {
    code: 'PC-CREDENTIAL-POST',
    severity: 'critical',
    message: 'Sends password or token values to an external address.',
    pattern: /(password|passwd|jwt_token|api[_-]?key|secret)\s*[:=][^;\n]{0,60}(https?:\/\/|fetch\s*\()/gi,
  },

  // ── Needs a human. Legitimate games do these; so do bad ones. ──
  {
    code: 'PC-PARENT-ACCESS',
    severity: 'high',
    message:
      'Reaches into the page that embeds it (window.parent / top / opener). The SDK\'s postMessage channel is the supported way to talk to the platform.',
    pattern: /\b(?:window\.)?(?:top|parent|opener)\s*\.\s*(?:document|location|localStorage|sessionStorage|Auth|DB)\b/g,
  },
  {
    code: 'PC-STORAGE-ACCESS',
    severity: 'high',
    message:
      'Reads or writes browser storage. Normal for saving progress — but on our origin this is also how a bundle would reach another user\'s data.',
    pattern: /\b(?:localStorage|sessionStorage)\s*[.[]|document\s*\.\s*cookie/g,
  },
  {
    code: 'PC-EVAL',
    severity: 'high',
    message: 'Builds and runs code at runtime (eval / new Function). Whatever it runs is invisible to this scan.',
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(|\bsetTimeout\s*\(\s*["'`]/g,
  },
  {
    code: 'PC-DYNAMIC-SCRIPT',
    severity: 'high',
    message: 'Injects a <script> tag at runtime, which can pull in code that was never reviewed.',
    pattern: /createElement\s*\(\s*["'`]script["'`]\s*\)|document\s*\.\s*write\s*\([^)]*<script/gi,
  },
  {
    // Found in a real submission: a game bundle whose only "external origin"
    // finding was a stylesheet actually did `await import("https://…/sdk.es.js")`
    // on boot. The approved build and the code that runs are then two different
    // things, and the third party can change theirs at any time.
    code: 'PC-REMOTE-IMPORT',
    severity: 'high',
    message:
      'Imports a JavaScript module from a third-party URL at runtime. Whatever that server sends is executed here, and it is not part of what you are reviewing.',
    pattern: /\bimport\s*\(\s*["'`]https?:\/\/[^"'`]+/gi,
  },
  {
    code: 'PC-SERVICE-WORKER',
    severity: 'high',
    message:
      'Registers a service worker. That survives the game exiting and can intercept later requests on this origin.',
    pattern: /serviceWorker\s*\.\s*register/g,
  },
  {
    code: 'PC-PLATFORM-API',
    severity: 'high',
    message: 'Calls the PlayCarys API directly instead of going through the SDK.',
    pattern: /\/api\/v1\/|db-import|db-export/g,
  },
  {
    code: 'PC-EXTERNAL-NET',
    severity: 'high',
    message: 'Sends network requests to a third-party server. Review where the data goes.',
    pattern: /(?:fetch|open|WebSocket|EventSource|sendBeacon)\s*\(\s*["'`]https?:\/\/[^"'`]+/gi,
  },
  {
    code: 'PC-TOP-NAVIGATION',
    severity: 'high',
    message: 'Tries to navigate the whole browser tab away, which would take the player off the platform.',
    pattern: /(?:top|parent)\s*\.\s*location\s*(?:\.\s*(?:href|replace|assign))?\s*[=(]/g,
  },

  // ── Worth seeing, rarely decisive on their own. ─────────────
  {
    code: 'PC-EXTERNAL-RESOURCE',
    severity: 'medium',
    message: 'Loads an asset from a third-party origin. That origin can change what it serves after approval.',
    pattern: /(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi,
    only: ['.html', '.htm'],
  },
  {
    code: 'PC-NESTED-IFRAME',
    severity: 'medium',
    message: 'Embeds another page inside the game. Whatever it embeds is outside this review.',
    pattern: /<iframe\b/gi,
    only: ['.html', '.htm'],
  },
  {
    code: 'PC-EXTERNAL-FORM',
    severity: 'medium',
    message: 'A form submits to an external address — a way to collect player input off-platform.',
    pattern: /<form[^>]*action\s*=\s*["']https?:\/\//gi,
    only: ['.html', '.htm'],
  },
  {
    code: 'PC-ENCODED-PAYLOAD',
    severity: 'medium',
    message: 'Decodes a base64 blob at runtime, a common way to hide code from exactly this kind of scan.',
    pattern: /\batob\s*\(|fromCharCode\s*\.\s*apply|unescape\s*\(\s*["']%/g,
  },
  // (Credential/secret files are matched by NAME, not content — see SUSPICIOUS_NAMES.)

  // ── Informational. ─────────────────────────────────────────
  {
    code: 'PC-GEOLOCATION',
    severity: 'low',
    message: 'Requests the player\'s physical location.',
    pattern: /navigator\s*\.\s*geolocation/g,
  },
  {
    code: 'PC-MEDIA-CAPTURE',
    severity: 'low',
    message: 'Requests camera or microphone access.',
    pattern: /getUserMedia|getDisplayMedia/g,
  },
];

/** Filenames that shouldn't be in a game build. Checked by name, not content. */
const SUSPICIOUS_NAMES: { pattern: RegExp; code: string; severity: ScanSeverity; message: string }[] = [
  {
    pattern: /^\.env(\..+)?$/i,
    code: 'PC-SECRET-FILE',
    severity: 'medium',
    message: 'Environment file shipped inside the build — it may contain the publisher\'s own secrets.',
  },
  {
    pattern: /^(id_rsa|id_ed25519|.*\.pem|.*\.key|.*\.pfx|credentials\.json)$/i,
    code: 'PC-SECRET-FILE',
    severity: 'medium',
    message: 'Private key or credential file shipped inside the build.',
  },
  {
    pattern: /^\.(git|npmrc|htpasswd)/i,
    code: 'PC-VCS-ARTIFACT',
    severity: 'low',
    message: 'Version-control or tooling artefact left in the build.',
  },
];

/** Image extensions whose first bytes we verify, to catch a script renamed to .png. */
const IMAGE_MAGIC: Record<string, Buffer[]> = {
  '.png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  '.jpg': [Buffer.from([0xff, 0xd8, 0xff])],
  '.jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  '.gif': [Buffer.from('GIF8', 'ascii')],
  '.webp': [Buffer.from('RIFF', 'ascii')],
};

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  /**
   * Walk an extracted bundle directory and produce a report.
   *
   * Reads from disk rather than from the in-memory zip entries on purpose:
   * the same code path then serves both "scan on upload" and "re-scan an
   * already-installed build", so a re-scan can never disagree with the
   * original because it looked at a different copy.
   */
  scanDirectory(root: string): ScanReport {
    const findings: ScanFinding[] = [];
    const manifest: ScanFileEntry[] = [];
    const origins = new Set<string>();
    let totalBytes = 0;
    let truncated: string | undefined;

    const files = this.walk(root);
    for (const abs of files) {
      const rel = path.relative(root, abs).split(path.sep).join('/');
      let buf: Buffer;
      try {
        buf = fs.readFileSync(abs);
      } catch (err) {
        findings.push(this.finding('PC-UNREADABLE', 'low', 'File could not be read during scanning.', rel, 0, ''));
        continue;
      }

      totalBytes += buf.length;
      manifest.push({
        path: rel,
        bytes: buf.length,
        sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      });

      if (findings.length < MAX_FINDINGS) {
        this.checkFileName(rel, findings);
        this.checkMagicBytes(rel, buf, findings);
        if (this.isText(rel)) {
          const text = buf.subarray(0, MAX_SCAN_BYTES_PER_FILE).toString('utf8');
          if (buf.length > MAX_SCAN_BYTES_PER_FILE) {
            truncated = truncated ?? `Files larger than ${MAX_SCAN_BYTES_PER_FILE / 1024 / 1024} MB were only partly scanned.`;
          }
          this.applyRules(rel, text, findings);
          this.collectOrigins(text, origins);
        }
      } else {
        truncated = `Stopped after ${MAX_FINDINGS} findings — fix these first, then re-scan.`;
      }
    }

    const summary: Record<ScanSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach((f) => (summary[f.severity] += 1));

    const report: ScanReport = {
      scanner_version: SCANNER_VERSION,
      scanned_at: new Date().toISOString(),
      verdict: this.verdictFor(summary),
      bundle_hash: this.bundleHash(manifest),
      file_count: manifest.length,
      total_bytes: totalBytes,
      findings: this.rank(findings),
      manifest: manifest.sort((a, b) => a.path.localeCompare(b.path)),
      external_origins: [...origins].sort(),
      summary,
      truncated,
    };

    this.logger.log(
      `Scanned ${root}: ${report.verdict} (${summary.critical}C/${summary.high}H/${summary.medium}M) over ${report.file_count} files`,
    );
    return report;
  }

  /**
   * A build fails only on certainties. Everything else lands on 'warn',
   * which means "an admin has to read this", not "reject it".
   */
  private verdictFor(summary: Record<ScanSeverity, number>): ScanVerdict {
    if (summary.critical > 0) return 'fail';
    if (summary.high > 0 || summary.medium > 0) return 'warn';
    return 'pass';
  }

  /** Stable fingerprint of a build: every path and its hash, order-independent. */
  private bundleHash(manifest: ScanFileEntry[]): string {
    const lines = [...manifest]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => `${f.path}\0${f.sha256}`)
      .join('\n');
    return crypto.createHash('sha256').update(lines).digest('hex');
  }

  private walk(dir: string, acc: string[] = [], depth = 0): string[] {
    if (depth > 20) return acc;
    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return acc;
    }
    for (const item of items) {
      const abs = path.join(dir, item.name);
      if (item.isDirectory()) this.walk(abs, acc, depth + 1);
      else if (item.isFile()) acc.push(abs);
    }
    return acc;
  }

  private isText(rel: string): boolean {
    return TEXT_EXTENSIONS.has(path.extname(rel).toLowerCase());
  }

  private checkFileName(rel: string, findings: ScanFinding[]): void {
    const base = path.basename(rel);
    for (const rule of SUSPICIOUS_NAMES) {
      if (rule.pattern.test(base)) {
        findings.push(this.finding(rule.code, rule.severity, rule.message, rel, 0, base));
      }
    }
  }

  /**
   * An "image" that does not start with that format's magic bytes is either
   * broken or is something else wearing an image's extension.
   */
  private checkMagicBytes(rel: string, buf: Buffer, findings: ScanFinding[]): void {
    const ext = path.extname(rel).toLowerCase();
    const magics = IMAGE_MAGIC[ext];
    if (!magics || buf.length < 4) return;
    const matches = magics.some((m) => buf.subarray(0, m.length).equals(m));
    if (matches) return;

    const head = buf.subarray(0, 200).toString('utf8');
    const looksLikeCode = /<script|<html|function\s|=>|var\s|const\s/i.test(head);
    findings.push(
      this.finding(
        'PC-EXTENSION-MISMATCH',
        looksLikeCode ? 'critical' : 'low',
        looksLikeCode
          ? `Declared as ${ext} but the file contains code. An asset extension is being used to smuggle a script past the file-type check.`
          : `Declared as ${ext} but the contents do not match that format. Probably a broken export.`,
        rel,
        0,
        head.slice(0, SNIPPET_LIMIT).replace(/\s+/g, ' ').trim(),
      ),
    );
  }

  private applyRules(rel: string, text: string, findings: ScanFinding[]): void {
    const ext = path.extname(rel).toLowerCase();
    const lineStarts = this.lineIndex(text);

    for (const rule of RULES) {
      if (rule.only && !rule.only.includes(ext)) continue;
      if (!rule.only && (ext === '.svg' || ext === '.json' || ext === '.map')) continue;

      // Fresh regex per file: a shared /g regex carries lastIndex across calls
      // and would skip matches in every file after the first.
      const re = new RegExp(rule.pattern.source, rule.pattern.flags);
      let hits = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null && hits < MAX_HITS_PER_RULE_PER_FILE) {
        hits += 1;
        const line = this.lineAt(lineStarts, m.index);
        findings.push(
          this.finding(rule.code, rule.severity, rule.message, rel, line, this.lineText(text, lineStarts, line)),
        );
        if (m.index === re.lastIndex) re.lastIndex += 1; // zero-width guard
        if (findings.length >= MAX_FINDINGS) return;
      }
    }
  }

  private collectOrigins(text: string, origins: Set<string>): void {
    const re = /https?:\/\/[a-z0-9.-]+(?::\d+)?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (origins.size > 100) return;
      const host = m[0].toLowerCase();
      // Schema/namespace URLs are boilerplate in every SVG and XHTML doc.
      if (/w3\.org|xmlns|schemas\.|purl\.org|creativecommons\.org/.test(host)) continue;
      origins.add(host);
    }
  }

  /** Offsets at which each line starts, so a match index becomes a line number. */
  private lineIndex(text: string): number[] {
    const starts = [0];
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) starts.push(i + 1);
    }
    return starts;
  }

  private lineAt(starts: number[], index: number): number {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1; // 1-indexed
  }

  private lineText(text: string, starts: number[], line: number): string {
    const from = starts[line - 1] ?? 0;
    const to = starts[line] ?? text.length;
    const raw = text.slice(from, to).replace(/\s+/g, ' ').trim();
    return raw.length > SNIPPET_LIMIT ? `${raw.slice(0, SNIPPET_LIMIT)}…` : raw;
  }

  private finding(
    code: string,
    severity: ScanSeverity,
    message: string,
    file: string,
    line: number,
    snippet: string,
  ): ScanFinding {
    return { code, severity, message, file, line, snippet };
  }

  /** Most severe first, so the admin's first screenful is the part that matters. */
  private rank(findings: ScanFinding[]): ScanFinding[] {
    const order: Record<ScanSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return [...findings].sort(
      (a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || a.line - b.line,
    );
  }
}
