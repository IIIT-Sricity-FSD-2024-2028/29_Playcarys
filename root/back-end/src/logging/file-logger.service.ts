// ============================================================
//  File-backed logger, flushed at regular intervals, into DATED files.
//
//  Eval requirement: "Logs and error information must be saved in files
//  regularly." Two log families are kept, both inside the project's
//  existing root `logs/` folder (the same folder run.bat already writes
//  backend.log/frontend.log/tunnel.log into via hidden.vbs — this just adds
//  structured, dated files alongside those, it does not replace them):
//    logs/access-YYYY-MM-DD.log  — one line per request (RequestLoggerMiddleware)
//    logs/error-YYYY-MM-DD.log   — one entry per exception (AllExceptionsFilter)
//
//  Both are buffered in memory and flushed by a timer rather than written
//  per-line, so a request storm doesn't turn into a synchronous-fs-write
//  storm. The date is computed fresh on every flush, so logging never has to
//  be restarted at midnight — the next flush just starts a new file.
//
//  Never logs: passwords, tokens, reset codes, request bodies, file bytes.
//  Callers (RequestLoggerMiddleware, AuditMiddleware, AllExceptionsFilter)
//  only ever pass pre-built plain-text lines that were never given the body.
// ============================================================

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const FLUSH_INTERVAL_MS = 10_000;

// dist/logging/file-logger.service.js -> up 3 (dist, back-end, project root)
// matches where run.bat's own logs already live: "<project root>/logs".
const LOGS_DIR = path.join(__dirname, '..', '..', '..', 'logs');

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

@Injectable()
export class FileLoggerService implements OnModuleInit, OnModuleDestroy {
  private accessBuffer: string[] = [];
  private errorBuffer: string[] = [];
  private timer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    this.timer.unref?.(); // don't keep the process alive just for this timer
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.flush();
  }

  /** Buffer one access-log line; written out on the next flush tick. */
  log(line: string): void {
    this.accessBuffer.push(line);
  }

  /** Buffer one error-log entry; written out on the next flush tick. */
  error(line: string): void {
    this.errorBuffer.push(line);
  }

  /** Write and clear whatever is currently buffered. Safe to call anytime. */
  flush(): void {
    const stamp = todayStamp();
    if (this.accessBuffer.length) {
      const chunk = this.accessBuffer.join('\n') + '\n';
      this.accessBuffer = [];
      this.appendSafe(path.join(LOGS_DIR, `access-${stamp}.log`), chunk);
    }
    if (this.errorBuffer.length) {
      const chunk = this.errorBuffer.join('\n') + '\n';
      this.errorBuffer = [];
      this.appendSafe(path.join(LOGS_DIR, `error-${stamp}.log`), chunk);
    }
  }

  private appendSafe(file: string, chunk: string): void {
    try {
      if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
      fs.appendFileSync(file, chunk); // append-only — never overwrite prior entries
    } catch {
      // A failed log write must never take the app down.
    }
  }
}
