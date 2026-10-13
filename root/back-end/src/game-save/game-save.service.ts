import {
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import { games, users, game_saves, MAX_GAME_SAVE_BYTES, GameSave } from '../data/store';

// ── Domain rules ────────────────────────────────────────────
// R-SAVE-1: One blob per (user_id, game_id). Last write wins — a save is
//           current state, not a historical fact, so there is nothing to union.
// R-SAVE-2: The platform provides STORAGE. What the blob means is the game's
//           business and the platform never parses it.
// R-SAVE-3: 64 KB hard ceiling per (user, game), refused server-side.
// R-SAVE-4: A save is addressed by (user, game). Game A cannot name game B's
//           row, because the game id comes from the platform wrapper — not from
//           the game — on every call.
// ────────────────────────────────────────────────────────────

@Injectable()
export class GameSaveService {
  private gameOrThrow(gameId: number) {
    const g = games.find((x) => Number(x.game_id) === Number(gameId));
    if (!g) throw new NotFoundException(`Game ${gameId} not found`);
    return g;
  }

  private userOrThrow(userId: number) {
    const u = users.find((x) => Number(x.user_id) === Number(userId));
    if (!u) throw new NotFoundException(`User ${userId} not found`);
    return u;
  }

  /**
   * Read one player's save for one game.
   *
   * Returns null data rather than a 404 when nothing has been saved yet: "this
   * player has never played" is an ordinary answer, not an error, and a game
   * booting for the first time should not have to treat it as one.
   */
  load(gameId: number, userId: number) {
    this.gameOrThrow(gameId);
    this.userOrThrow(userId);

    const row = game_saves.find(
      (s) => Number(s.user_id) === Number(userId) && Number(s.game_id) === Number(gameId),
    );

    if (!row) {
      return { user_id: Number(userId), game_id: Number(gameId), data: null, updated_at: null, bytes: 0 };
    }

    let parsed: unknown = null;
    try { parsed = JSON.parse(row.data); } catch { parsed = row.data; }
    return { ...row, data: parsed };
  }

  save(gameId: number, userId: number, data: unknown) {
    this.gameOrThrow(gameId);
    this.userOrThrow(userId);

    if (data === undefined) throw new BadRequestException('No save data provided.');

    // Stored as a string so the size cap is measurable and enforceable, and so
    // the platform genuinely does not care what is inside.
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    if (typeof text !== 'string') throw new BadRequestException('Save data could not be serialised.');

    // BYTES, not characters. A string of 40,000 emoji is 40,000 characters and
    // roughly 160,000 bytes — measuring length would let it through and then
    // put four times the intended load on the one file this whole platform
    // keeps its data in.
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > MAX_GAME_SAVE_BYTES) {
      throw new PayloadTooLargeException(
        `Save is ${bytes} bytes; the limit is ${MAX_GAME_SAVE_BYTES} bytes (64 KB) per game per player.`,
      );
    }

    const now = new Date().toISOString();
    const existing = game_saves.find(
      (s) => Number(s.user_id) === Number(userId) && Number(s.game_id) === Number(gameId),
    );

    if (existing) {
      // Last-write-wins, in place. No history: yesterday's coin count is not a
      // fact anyone needs, and keeping every save would grow without bound.
      existing.data = text;
      existing.updated_at = now;
      existing.bytes = bytes;
      return { ...existing, data, saved: true };
    }

    const row: GameSave = {
      user_id: Number(userId),
      game_id: Number(gameId),
      data: text,
      updated_at: now,
      bytes,
    };
    game_saves.push(row);
    return { ...row, data, saved: true };
  }
}
