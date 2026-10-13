"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ScanService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanService = exports.SCANNER_VERSION = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
exports.SCANNER_VERSION = '1.0.0';
const TEXT_EXTENSIONS = new Set([
    '.html', '.htm', '.js', '.mjs', '.cjs', '.jsx', '.ts',
    '.json', '.css', '.svg', '.xml', '.txt', '.map',
]);
const MAX_SCAN_BYTES_PER_FILE = 2 * 1024 * 1024;
const MAX_HITS_PER_RULE_PER_FILE = 3;
const MAX_FINDINGS = 400;
const SNIPPET_LIMIT = 180;
const RULES = [
    {
        code: 'PC-SESSION-READ',
        severity: 'critical',
        message: 'Reads the PlayCarys session key. A game has no reason to touch platform credentials — this is session theft.',
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
    {
        code: 'PC-PARENT-ACCESS',
        severity: 'high',
        message: 'Reaches into the page that embeds it (window.parent / top / opener). The SDK\'s postMessage channel is the supported way to talk to the platform.',
        pattern: /\b(?:window\.)?(?:top|parent|opener)\s*\.\s*(?:document|location|localStorage|sessionStorage|Auth|DB)\b/g,
    },
    {
        code: 'PC-STORAGE-ACCESS',
        severity: 'high',
        message: 'Reads or writes browser storage. Normal for saving progress — but on our origin this is also how a bundle would reach another user\'s data.',
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
        code: 'PC-REMOTE-IMPORT',
        severity: 'high',
        message: 'Imports a JavaScript module from a third-party URL at runtime. Whatever that server sends is executed here, and it is not part of what you are reviewing.',
        pattern: /\bimport\s*\(\s*["'`]https?:\/\/[^"'`]+/gi,
    },
    {
        code: 'PC-SERVICE-WORKER',
        severity: 'high',
        message: 'Registers a service worker. That survives the game exiting and can intercept later requests on this origin.',
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
const SUSPICIOUS_NAMES = [
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
const IMAGE_MAGIC = {
    '.png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    '.jpg': [Buffer.from([0xff, 0xd8, 0xff])],
    '.jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
    '.gif': [Buffer.from('GIF8', 'ascii')],
    '.webp': [Buffer.from('RIFF', 'ascii')],
};
let ScanService = ScanService_1 = class ScanService {
    constructor() {
        this.logger = new common_1.Logger(ScanService_1.name);
    }
    scanDirectory(root) {
        const findings = [];
        const manifest = [];
        const origins = new Set();
        let totalBytes = 0;
        let truncated;
        const files = this.walk(root);
        for (const abs of files) {
            const rel = path.relative(root, abs).split(path.sep).join('/');
            let buf;
            try {
                buf = fs.readFileSync(abs);
            }
            catch (err) {
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
            }
            else {
                truncated = `Stopped after ${MAX_FINDINGS} findings — fix these first, then re-scan.`;
            }
        }
        const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        findings.forEach((f) => (summary[f.severity] += 1));
        const report = {
            scanner_version: exports.SCANNER_VERSION,
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
        this.logger.log(`Scanned ${root}: ${report.verdict} (${summary.critical}C/${summary.high}H/${summary.medium}M) over ${report.file_count} files`);
        return report;
    }
    verdictFor(summary) {
        if (summary.critical > 0)
            return 'fail';
        if (summary.high > 0 || summary.medium > 0)
            return 'warn';
        return 'pass';
    }
    bundleHash(manifest) {
        const lines = [...manifest]
            .sort((a, b) => a.path.localeCompare(b.path))
            .map((f) => `${f.path}\0${f.sha256}`)
            .join('\n');
        return crypto.createHash('sha256').update(lines).digest('hex');
    }
    walk(dir, acc = [], depth = 0) {
        if (depth > 20)
            return acc;
        let items;
        try {
            items = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return acc;
        }
        for (const item of items) {
            const abs = path.join(dir, item.name);
            if (item.isDirectory())
                this.walk(abs, acc, depth + 1);
            else if (item.isFile())
                acc.push(abs);
        }
        return acc;
    }
    isText(rel) {
        return TEXT_EXTENSIONS.has(path.extname(rel).toLowerCase());
    }
    checkFileName(rel, findings) {
        const base = path.basename(rel);
        for (const rule of SUSPICIOUS_NAMES) {
            if (rule.pattern.test(base)) {
                findings.push(this.finding(rule.code, rule.severity, rule.message, rel, 0, base));
            }
        }
    }
    checkMagicBytes(rel, buf, findings) {
        const ext = path.extname(rel).toLowerCase();
        const magics = IMAGE_MAGIC[ext];
        if (!magics || buf.length < 4)
            return;
        const matches = magics.some((m) => buf.subarray(0, m.length).equals(m));
        if (matches)
            return;
        const head = buf.subarray(0, 200).toString('utf8');
        const looksLikeCode = /<script|<html|function\s|=>|var\s|const\s/i.test(head);
        findings.push(this.finding('PC-EXTENSION-MISMATCH', looksLikeCode ? 'critical' : 'low', looksLikeCode
            ? `Declared as ${ext} but the file contains code. An asset extension is being used to smuggle a script past the file-type check.`
            : `Declared as ${ext} but the contents do not match that format. Probably a broken export.`, rel, 0, head.slice(0, SNIPPET_LIMIT).replace(/\s+/g, ' ').trim()));
    }
    applyRules(rel, text, findings) {
        const ext = path.extname(rel).toLowerCase();
        const lineStarts = this.lineIndex(text);
        for (const rule of RULES) {
            if (rule.only && !rule.only.includes(ext))
                continue;
            if (!rule.only && (ext === '.svg' || ext === '.json' || ext === '.map'))
                continue;
            const re = new RegExp(rule.pattern.source, rule.pattern.flags);
            let hits = 0;
            let m;
            while ((m = re.exec(text)) !== null && hits < MAX_HITS_PER_RULE_PER_FILE) {
                hits += 1;
                const line = this.lineAt(lineStarts, m.index);
                findings.push(this.finding(rule.code, rule.severity, rule.message, rel, line, this.lineText(text, lineStarts, line)));
                if (m.index === re.lastIndex)
                    re.lastIndex += 1;
                if (findings.length >= MAX_FINDINGS)
                    return;
            }
        }
    }
    collectOrigins(text, origins) {
        const re = /https?:\/\/[a-z0-9.-]+(?::\d+)?/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
            if (origins.size > 100)
                return;
            const host = m[0].toLowerCase();
            if (/w3\.org|xmlns|schemas\.|purl\.org|creativecommons\.org/.test(host))
                continue;
            origins.add(host);
        }
    }
    lineIndex(text) {
        const starts = [0];
        for (let i = 0; i < text.length; i++) {
            if (text.charCodeAt(i) === 10)
                starts.push(i + 1);
        }
        return starts;
    }
    lineAt(starts, index) {
        let lo = 0;
        let hi = starts.length - 1;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (starts[mid] <= index)
                lo = mid;
            else
                hi = mid - 1;
        }
        return lo + 1;
    }
    lineText(text, starts, line) {
        const from = starts[line - 1] ?? 0;
        const to = starts[line] ?? text.length;
        const raw = text.slice(from, to).replace(/\s+/g, ' ').trim();
        return raw.length > SNIPPET_LIMIT ? `${raw.slice(0, SNIPPET_LIMIT)}…` : raw;
    }
    finding(code, severity, message, file, line, snippet) {
        return { code, severity, message, file, line, snippet };
    }
    rank(findings) {
        const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return [...findings].sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);
    }
};
exports.ScanService = ScanService;
exports.ScanService = ScanService = ScanService_1 = __decorate([
    (0, common_1.Injectable)()
], ScanService);
//# sourceMappingURL=scan.service.js.map