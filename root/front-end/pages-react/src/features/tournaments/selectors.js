import { tournamentsAdapter } from './tournamentSlice';
import { AsyncStatus } from '../../app/asyncUtils';

const tournamentsSelectors = tournamentsAdapter.getSelectors((state) => state.tournaments);

// ── Entity Selectors ─────────────────────────────────────────

export const selectAllTournaments = tournamentsSelectors.selectAll;
export const selectTournamentById = (state, id) =>
  id != null ? tournamentsSelectors.selectById(state, String(id)) : undefined;
export const selectTournamentEntities = tournamentsSelectors.selectEntities;
export const selectTournamentsTotal = tournamentsSelectors.selectTotal;

// ── Status and Error Selectors ───────────────────────────────

export const selectTournamentsListStatus = (state) =>
  state.tournaments?.listStatus || AsyncStatus.IDLE;
export const selectTournamentsListError = (state) =>
  state.tournaments?.listError || null;

export const selectTournamentDetailStatus = (state) =>
  state.tournaments?.detailStatus || AsyncStatus.IDLE;
export const selectTournamentDetailError = (state) =>
  state.tournaments?.detailError || null;

export const selectTournamentsMutationStatus = (state) =>
  state.tournaments?.mutationStatus || AsyncStatus.IDLE;
export const selectTournamentsMutationError = (state) =>
  state.tournaments?.mutationError || null;

export const selectTournamentStagesStatus = (state) =>
  state.tournaments?.stageStatus || AsyncStatus.IDLE;
export const selectTournamentStagesError = (state) =>
  state.tournaments?.stageError || null;

// Compatibility aliases for list status / error
export const selectTournamentsStatus = (state) =>
  state.tournaments?.listStatus || state.tournaments?.status || AsyncStatus.IDLE;
export const selectTournamentsError = (state) =>
  state.tournaments?.listError || state.tournaments?.error || null;

// ── Stages Selectors ─────────────────────────────────────────

export const selectTournamentStages = (state, tournamentId) =>
  (tournamentId != null && state.tournaments?.stagesByTournamentId)
    ? state.tournaments.stagesByTournamentId[String(tournamentId)] || []
    : [];

// ── Registrations Selectors ──────────────────────────────────

export const selectRegistrationsByTournament = (state, tournamentId) =>
  (tournamentId != null && state.registrations?.byTournament)
    ? state.registrations.byTournament[String(tournamentId)] || []
    : [];

export const selectPlayerRegistration = (state, tournamentId, playerId) => {
  if (tournamentId == null || playerId == null) return undefined;
  const list = selectRegistrationsByTournament(state, tournamentId);
  const targetId = String(playerId);
  return list.find(
    (r) =>
      String(r.playerId || r.player_id) === targetId ||
      String(r.id) === targetId
  );
};

export const selectTeamRegistration = (state, tournamentId, teamId) => {
  if (tournamentId == null || teamId == null) return undefined;
  const list = selectRegistrationsByTournament(state, tournamentId);
  const targetId = String(teamId);
  return list.find((r) => String(r.teamId || r.team_id) === targetId);
};

export const selectIsPlayerRegistered = (state, tournamentId, playerId) =>
  Boolean(selectPlayerRegistration(state, tournamentId, playerId));

export const selectIsTeamRegistered = (state, tournamentId, teamId) =>
  Boolean(selectTeamRegistration(state, tournamentId, teamId));

export const selectRegistrationsFetchStatus = (state, tournamentId) => {
  if (tournamentId != null && state.registrations?.statusByTournament) {
    return state.registrations.statusByTournament[String(tournamentId)] || AsyncStatus.IDLE;
  }
  return state.registrations?.fetchStatus || AsyncStatus.IDLE;
};

export const selectRegistrationsFetchError = (state, tournamentId) => {
  if (tournamentId != null && state.registrations?.errorByTournament) {
    return state.registrations.errorByTournament[String(tournamentId)] || null;
  }
  return state.registrations?.fetchError || null;
};

export const selectRegistrationsMutationStatus = (state) =>
  state.registrations?.mutationStatus || AsyncStatus.IDLE;

export const selectRegistrationsMutationError = (state) =>
  state.registrations?.mutationError || null;

export const selectRegistrationStatus = (state) =>
  state.registrations?.fetchStatus || state.registrations?.status || AsyncStatus.IDLE;

export const selectRegistrationError = (state) =>
  state.registrations?.fetchError || state.registrations?.error || null;

// ── Tournament Play Selectors ────────────────────────────────

export const selectTournamentPlay = (state, tournamentId) =>
  (tournamentId != null && state.tournamentPlay?.byTournament)
    ? state.tournamentPlay.byTournament[String(tournamentId)] || {}
    : {};

export const selectTournamentOverview = (state, tournamentId) =>
  (tournamentId != null && state.tournamentPlay?.byTournament)
    ? state.tournamentPlay.byTournament[String(tournamentId)]?.overview
    : undefined;

export const selectTournamentBracket = (state, tournamentId) =>
  (tournamentId != null && state.tournamentPlay?.byTournament)
    ? state.tournamentPlay.byTournament[String(tournamentId)]?.bracket
    : undefined;

export const selectTournamentLeaderboard = (state, tournamentId) =>
  (tournamentId != null && state.tournamentPlay?.byTournament)
    ? state.tournamentPlay.byTournament[String(tournamentId)]?.leaderboard
    : undefined;

export const selectTournamentChat = (state, tournamentId) =>
  (tournamentId != null && state.tournamentPlay?.byTournament)
    ? state.tournamentPlay.byTournament[String(tournamentId)]?.chat || []
    : [];
