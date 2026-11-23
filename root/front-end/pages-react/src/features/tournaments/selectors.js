import { tournamentsAdapter } from './tournamentSlice';

const tournamentsSelectors = tournamentsAdapter.getSelectors((state) => state.tournaments);

export const selectAllTournaments = tournamentsSelectors.selectAll;
export const selectTournamentById = (state, id) => tournamentsSelectors.selectById(state, String(id));
export const selectTournamentEntities = tournamentsSelectors.selectEntities;
export const selectTournamentsTotal = tournamentsSelectors.selectTotal;

export const selectTournamentsStatus = (state) => state.tournaments?.status;
export const selectTournamentsError = (state) => state.tournaments?.error;
export const selectTournamentStages = (state, tournamentId) =>
  state.tournaments?.stagesByTournamentId[String(tournamentId)] || [];

export const selectRegistrationsByTournament = (state, tournamentId) =>
  state.registrations?.byTournament[String(tournamentId)] || [];

export const selectTournamentPlay = (state, tournamentId) =>
  state.tournamentPlay?.byTournament[String(tournamentId)] || {};

export const selectTournamentOverview = (state, tournamentId) =>
  state.tournamentPlay?.byTournament[String(tournamentId)]?.overview;

export const selectTournamentBracket = (state, tournamentId) =>
  state.tournamentPlay?.byTournament[String(tournamentId)]?.bracket;

export const selectTournamentLeaderboard = (state, tournamentId) =>
  state.tournamentPlay?.byTournament[String(tournamentId)]?.leaderboard;

export const selectTournamentChat = (state, tournamentId) =>
  state.tournamentPlay?.byTournament[String(tournamentId)]?.chat || [];
