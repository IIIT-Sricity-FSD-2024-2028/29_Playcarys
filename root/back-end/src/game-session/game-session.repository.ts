import { Injectable } from '@nestjs/common';
import { sessions, GameSession, match_results } from '../data/store';

@Injectable()
export class GameSessionRepository {
  findAll(): GameSession[] {
    return [...sessions];
  }

  findById(session_id: number): GameSession | undefined {
    return sessions.find((s) => s.session_id === session_id);
  }

  findByGame(game_id: number): GameSession[] {
    return sessions.filter((s) => s.game_id === game_id);
  }

  findByStatus(status: string): GameSession[] {
    return sessions.filter((s) => s.status === status);
  }

  findByHost(hostId: number): GameSession[] {
    return sessions.filter((s) => s.created_by === hostId);
  }

  /**
   * Sessions a player took part in.
   *
   * Was answered by the player_session junction — "which lobbies is this person
   * seated in". That table is gone; match_results has always held one row per
   * player per match, which is the same question asked of real history.
   */
  findByPlayer(player_id: number): GameSession[] {
    const played = new Set(
      match_results
        .filter((r) => String(r.player_id) === String(player_id))
        .map((r) => String(r.session_id)),
    );
    return sessions.filter((s) => played.has(String(s.session_id)));
  }

  create(session: GameSession): GameSession {
    sessions.push(session);
    return session;
  }

  update(session_id: number, partial: Partial<GameSession>): GameSession | undefined {
    const idx = sessions.findIndex((s) => s.session_id === session_id);
    if (idx === -1) return undefined;
    Object.assign(sessions[idx], partial);
    return sessions[idx];
  }

  remove(session_id: number): boolean {
    const idx = sessions.findIndex((s) => s.session_id === session_id);
    if (idx === -1) return false;
    sessions.splice(idx, 1);
    return true;
  }

  nextId(): number {
    return sessions.length === 0
      ? 1
      : Math.max(...sessions.map((s) => s.session_id)) + 1;
  }

  // ── REMOVED: the player_session junction accessors ───────────────────────
  //
  // getMembers / getMemberCount / isMember / addMember / removeMember /
  // clearMembers, plus findBestAvailableSession ("the busiest room for this
  // game that is not full and that I am not already in").
  //
  // All seven managed seating in a lobby. Who played a match is now recorded in
  // match_results — see findByPlayer above — and who is playing one right now
  // is the `participants` array on the match row.
}
