// ============================================================
//  Model A — "PlayCarys Hosted" game bundles.
//
//  A publisher uploads a .zip of their web build; we validate it,
//  unpack it to front-end/games/<slug>/ and hand back the slug.
//  The frontend's static server (http-server on :8080) already
//  serves that directory, so the extracted game is immediately
//  reachable at /games/<slug>/index.html on the same origin as
//  the rest of the site — which is what lets the iframe wrapper
//  talk to it over postMessage.
// ============================================================

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { readZip, ZipEntry, ZipError } from './zip.util';

/**
 * Extensions we refuse outright. None of these can run in a browser, so their
 * only purpose inside a "web game" bundle would be to use the platform as a
 * file drop. Mirrors the client-side check in publisher/publish.html.
 */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.sh', '.dll', '.so', '.dylib',
  '.msi', '.vbs', '.ps1', '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb',
]);

/** Files that would let a bundle reconfigure the static server that hosts it. */
const BLOCKED_NAMES = new Set(['.htaccess', 'web.config', '.user.ini']);

export const MAX_BUNDLE_BYTES = 50 * 1024 * 1024; // matches the 50 MB hint in the publisher UI

export interface BundleResult {
  slug: string;
  /** Path relative to the frontend web root, e.g. "games/neon-drift". */
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

/**
 * Sidecar that records which game owns which extracted directory.
 *
 * An uploaded build is a *filesystem* fact, but the store it was recorded in
 * is in-memory only and live_database.json is rewritten wholesale by any
 * client's db-import. Both of those lose play_path on the next restart or
 * stale sync, which orphans the extracted files: the build sits on disk while
 * the platform has forgotten it exists. Keeping the mapping next to the files
 * it describes means the two can never disagree.
 */
const MANIFEST_FILE = '.bundles.json';

@Injectable()
export class BundleService {
  private readonly logger = new Logger(BundleService.name);

  /**
   * Resolve <repo>/front-end/games, creating it if needed.
   *
   * GAMES_DIR overrides this outright (useful if the frontend is deployed
   * separately). Otherwise we walk up from the compiled file looking for a
   * sibling front-end/ directory, which survives both `nest start` (cwd =
   * back-end/) and running dist/ directly from elsewhere.
   */
  getGamesRoot(): string {
    if (process.env.GAMES_DIR) return process.env.GAMES_DIR;

    const candidates = [
      path.join(process.cwd(), '..', 'front-end', 'games'),
      path.join(process.cwd(), 'front-end', 'games'),
    ];
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
      candidates.push(path.join(dir, 'front-end', 'games'));
      dir = path.dirname(dir);
    }

    const existing = candidates.find((c) => fs.existsSync(c));
    if (existing) return existing;

    // Nothing found (fresh checkout with no games/ yet) — create the most likely one.
    const fallback = candidates[0];
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }

  /**
   * Turn a game title into a URL-safe directory name. Suffixed with the game id
   * so two publishers can both ship a game called "Chess" without colliding,
   * and so a slug is stable across re-uploads of the same game.
   */
  buildSlug(gameName: string, gameId: number): string {
    const base = String(gameName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return `${base || 'game'}-${gameId}`;
  }

  /**
   * Validate + extract an uploaded archive. Throws BadRequestException with a
   * publisher-readable message on any rejection.
   */
  install(buffer: Buffer, gameName: string, gameId: number): BundleResult {
    if (!buffer?.length) throw new BadRequestException('No file was uploaded');
    if (buffer.length > MAX_BUNDLE_BYTES) {
      throw new BadRequestException(
        `Bundle is ${(buffer.length / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_BUNDLE_BYTES / 1024 / 1024} MB. ` +
          `For a build this large, submit it as a self-hosted game instead.`,
      );
    }

    let entries: ZipEntry[];
    try {
      entries = readZip(buffer);
    } catch (err) {
      if (err instanceof ZipError) throw new BadRequestException(err.message);
      throw err;
    }

    entries = this.stripWrapperFolder(entries);
    this.assertSafe(entries);

    const entryFile = entries.find((e) => e.path === 'index.html');
    if (!entryFile) {
      throw new BadRequestException(
        'No index.html at the root of the archive. Zip the *contents* of your build ' +
          'folder, not the folder itself.',
      );
    }

    const slug = this.buildSlug(gameName, gameId);
    const target = path.join(this.getGamesRoot(), slug);

    // Extract to a temp dir first, then swap — a failed re-upload must not
    // leave the previously working build half-deleted.
    const staging = `${target}.incoming-${process.pid}`;
    fs.rmSync(staging, { recursive: true, force: true });

    let totalBytes = 0;
    try {
      for (const entry of entries) {
        const dest = path.join(staging, entry.path);
        // Belt-and-braces: normaliseEntryPath already rejected traversal, but
        // re-check the resolved path actually lands inside the staging dir.
        if (!this.isInside(staging, dest)) {
          throw new BadRequestException(`Entry "${entry.path}" resolves outside the target directory`);
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, entry.contents);
        totalBytes += entry.contents.length;
      }

      const previous = `${target}.old-${process.pid}`;
      if (fs.existsSync(target)) fs.renameSync(target, previous);
      fs.renameSync(staging, target);
      fs.rmSync(previous, { recursive: true, force: true });
    } catch (err) {
      fs.rmSync(staging, { recursive: true, force: true });
      throw err;
    }

    const record: ManifestEntry = {
      game_id: gameId,
      slug,
      play_path: `games/${slug}`,
      bundle_size: totalBytes,
      bundle_uploaded_at: new Date().toISOString(),
    };
    this.recordInManifest(record);

    this.logger.log(`Installed bundle for game ${gameId} -> games/${slug} (${entries.length} files)`);

    return {
      slug,
      playPath: record.play_path,
      entryFile: 'index.html',
      fileCount: entries.length,
      totalBytes,
    };
  }

  /** Remove an installed bundle. Safe to call when nothing is installed. */
  uninstall(slug: string): void {
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return; // never rm -rf an attacker-supplied path
    const target = path.join(this.getGamesRoot(), slug);
    if (this.isInside(this.getGamesRoot(), target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
    this.writeManifest(this.readManifest().filter((e) => e.slug !== slug));
  }

  // ── Manifest ────────────────────────────────────────────────

  private manifestPath(): string {
    return path.join(this.getGamesRoot(), MANIFEST_FILE);
  }

  readManifest(): ManifestEntry[] {
    try {
      const raw = fs.readFileSync(this.manifestPath(), 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return []; // absent or unreadable — rehydrate() falls back to a disk scan
    }
  }

  private writeManifest(entries: ManifestEntry[]): void {
    try {
      fs.writeFileSync(this.manifestPath(), JSON.stringify(entries, null, 2), 'utf8');
    } catch (err) {
      this.logger.error(`Could not write ${MANIFEST_FILE}: ${(err as Error).message}`);
    }
  }

  private recordInManifest(entry: ManifestEntry): void {
    const entries = this.readManifest().filter((e) => e.game_id !== entry.game_id);
    entries.push(entry);
    this.writeManifest(entries);
  }

  /**
   * Re-attach installed bundles to their game rows. Called on boot, after the
   * store has been seeded, so a restart (or a client that synced a stale game
   * list) can never leave a working build unreachable.
   *
   * Entries whose directory or entry file has disappeared are pruned, and any
   * directory present on disk but missing from the manifest is adopted — the
   * slug carries its game id, so the mapping is recoverable from the folder
   * name alone even if the manifest is lost entirely.
   */
  rehydrate(games: { game_id: number; [k: string]: any }[]): number {
    const root = this.getGamesRoot();
    const manifest = this.readManifest();
    const byGameId = new Map<number, ManifestEntry>();

    for (const entry of manifest) {
      if (fs.existsSync(path.join(root, entry.slug, 'index.html'))) {
        byGameId.set(entry.game_id, entry);
      } else {
        this.logger.warn(`Pruning manifest entry for missing bundle "${entry.slug}"`);
      }
    }

    // Adopt orphaned directories: "<name>-<gameId>" with an index.html.
    let dirs: string[] = [];
    try {
      dirs = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      return 0;
    }

    for (const dir of dirs) {
      const match = /^(.*)-(\d+)$/.exec(dir);
      if (!match) continue; // builtin folders (chess, hill_climbing) have no id suffix
      const gameId = parseInt(match[2], 10);
      if (byGameId.has(gameId)) continue;
      if (!fs.existsSync(path.join(root, dir, 'index.html'))) continue;
      if (!games.some((g) => g.game_id === gameId)) continue;

      this.logger.warn(`Adopting unregistered bundle directory "${dir}" for game ${gameId}`);
      byGameId.set(gameId, {
        game_id: gameId,
        slug: dir,
        play_path: `games/${dir}`,
        bundle_size: 0,
        bundle_uploaded_at: new Date().toISOString(),
      });
    }

    let applied = 0;
    for (const game of games) {
      const entry = byGameId.get(game.game_id);
      if (!entry) continue;
      game.hosting_type = 'hosted';
      game.play_path = entry.play_path;
      game.bundle_size = entry.bundle_size;
      game.bundle_uploaded_at = entry.bundle_uploaded_at;
      applied++;
    }

    this.writeManifest([...byGameId.values()]);
    return applied;
  }

  /**
   * Publishers habitually zip the folder rather than its contents, producing
   * "MyGame/index.html". If every entry shares one top-level directory, drop it
   * — this is the single most common upload mistake and it's unambiguous to fix.
   */
  private stripWrapperFolder(entries: ZipEntry[]): ZipEntry[] {
    // Ignore archiver metadata that macOS/Windows inject.
    const meaningful = entries.filter(
      (e) => !e.path.startsWith('__MACOSX/') && path.basename(e.path) !== '.DS_Store',
    );
    if (!meaningful.length) throw new BadRequestException('Archive contains no usable files');

    if (meaningful.some((e) => e.path === 'index.html')) return meaningful;

    const firstSegments = new Set(meaningful.map((e) => e.path.split('/')[0]));
    if (firstSegments.size !== 1) return meaningful;

    const wrapper = `${[...firstSegments][0]}/`;
    const stripped = meaningful
      .filter((e) => e.path.startsWith(wrapper))
      .map((e) => ({ ...e, path: e.path.slice(wrapper.length) }));

    return stripped.some((e) => e.path === 'index.html') ? stripped : meaningful;
  }

  /** Reject bundles containing anything that isn't browser-runnable content. */
  private assertSafe(entries: ZipEntry[]): void {
    for (const entry of entries) {
      const base = path.basename(entry.path).toLowerCase();
      const ext = path.extname(base);

      if (BLOCKED_EXTENSIONS.has(ext)) {
        throw new BadRequestException(
          `Blocked file "${entry.path}" — ${ext} files cannot run in a browser and are not allowed in a game bundle.`,
        );
      }
      if (BLOCKED_NAMES.has(base)) {
        throw new BadRequestException(`Blocked file "${entry.path}" — server config files are not allowed.`);
      }
    }
  }

  private isInside(parent: string, child: string): boolean {
    const rel = path.relative(path.resolve(parent), path.resolve(child));
    return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  }
}
