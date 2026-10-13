import { Game } from '../data/store';

/**
 * Strip the per-file scan manifest from a game row before it goes over the wire.
 *
 * The manifest is a complete file listing of the uploaded bundle — 665 entries
 * and 86.7 KB for Ancient Beast alone — stored directly on the game record. It
 * has exactly one reader: the admin file list on game-review.html, which fetches
 * GET /games/:id/scan-manifest on demand.
 *
 * This strip was written once, inline, for /db-export, where the manifest was
 * 65% of a 247 KB payload sent to every visitor on every page load. But
 * GameRepository.findAll()/findById() spread the raw rows, so GET /games still
 * shipped the whole thing — and the player dashboard calls GET /games on every
 * load, which quietly reintroduced the same bug through a different door.
 *
 * Hence a shared helper rather than a second copy of the same map: there are now
 * four call sites, and the next endpoint that returns a Game should use this too.
 *
 * Everything else on `scan` — verdict, summary, findings, hashes — is small and
 * genuinely used by the review UI, so it stays. `manifest_file_count` is kept so
 * a caller can still say "665 files" without downloading their names.
 */
export function stripScanManifest<T extends Partial<Game>>(game: T): T {
  const scan = (game as any)?.scan;
  if (!scan || !scan.manifest) return game;
  const { manifest, ...scanWithoutManifest } = scan;
  return {
    ...game,
    scan: { ...scanWithoutManifest, manifest_file_count: manifest.length },
  };
}

/** Same, for a list. */
export function stripScanManifests<T extends Partial<Game>>(list: T[]): T[] {
  return list.map((g) => stripScanManifest(g));
}
