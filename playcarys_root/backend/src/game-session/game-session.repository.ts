import { Injectable } from '@nestjs/common';
import {
  sessions,
  GameSession,
  player_session,
  PlayerSession,
} from '../data/store';

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

  // Sessions where a player is a member
  findByPlayer(player_id: number): GameSession[] {
    const sessionIds = player_session
      .filter((ps) => ps.player_id === player_id)
      .map((ps) => ps.session_id);
    return sessions.filter((s) => sessionIds.includes(s.session_id));
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

  // ── player_session junction ──────────────────────────────

  getMembers(session_id: number): PlayerSession[] {
    return player_session.filter((ps) => ps.session_id === session_id);
  }

  getMemberCount(session_id: number): number {
    return player_session.filter((ps) => ps.session_id === session_id).length;
  }

  isMember(player_id: number, session_id: number): boolean {
    return player_session.some(
      (ps) => ps.player_id === player_id && ps.session_id === session_id,
    );
  }

  addMember(player_id: number, session_id: number): PlayerSession {
    const entry = { player_id, session_id };
    player_session.push(entry);
    return entry;
  }

  removeMember(player_id: number, session_id: number): boolean {
    const idx = player_session.findIndex(
      (ps) => ps.player_id === player_id && ps.session_id === session_id,
    );
    if (idx === -1) return false;
    player_session.splice(idx, 1);
    return true;
  }

  clearMembers(session_id: number): void {
    const indicesToRemove: number[] = [];
    player_session.forEach((ps, idx) => {
      if (ps.session_id === session_id) indicesToRemove.push(idx);
    });
    // Remove in reverse order to preserve indices
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      player_session.splice(indicesToRemove[i], 1);
    }
  }

  // Quick Play: find the busiest available room for a game (not full, waiting, player not already in it)
  findBestAvailableSession(game_id: number, exclude_player_id: number): GameSession | undefined {
    return sessions
      .filter((s) => {
        if (s.game_id !== game_id) return false;
        if (s.status !== 'waiting') return false;
        if (this.isMember(exclude_player_id, s.session_id)) return false;
        if (this.getMemberCount(s.session_id) >= s.maxPlayers) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by most players first (busiest room wins)
        return this.getMemberCount(b.session_id) - this.getMemberCount(a.session_id);
      })[0];
  }
}
