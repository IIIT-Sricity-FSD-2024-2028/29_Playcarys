/**
 * Entity normalization utilities for API adapter boundary.
 * Normalizes entity IDs to canonical { id, ... } and resolves aliases
 * (user_id, game_id, tournament_id, match_id, etc.) while preserving all
 * backend attributes.
 */

export function normalizeEntity(item, aliasKeys = []) {
  if (!item || typeof item !== 'object') return item;

  // Unwrap single entity if wrapped in a data or item envelope
  const actualItem = (item.data && typeof item.data === 'object' && !Array.isArray(item.data) && item.id == null)
    ? item.data
    : (item.item && typeof item.item === 'object' && !Array.isArray(item.item) && item.id == null)
      ? item.item
      : item;

  const defaultAliasKeys = [
    'user_id', 'userId',
    'game_id', 'gameId',
    'tournament_id', 'tournamentId',
    'tournament_game_id', 'tournamentGameId',
    'stage_id', 'stageId',
    'team_id', 'teamId',
    'group_id', 'groupId',
    'report_id', 'reportId',
    'notification_id', 'notificationId',
    'session_id', 'sessionId',
    'match_id', 'matchId',
    'registration_id', 'registrationId',
    'player_id', 'playerId',
    'payout_id', 'payoutId',
    'achievement_id', 'achievementId',
    'message_id', 'messageId',
    'chat_id', 'chatId'
  ];
  const keysToCheck = [...aliasKeys, ...defaultAliasKeys];

  let rawId = actualItem.id;
  if (rawId == null) {
    for (const key of keysToCheck) {
      if (actualItem[key] != null) {
        rawId = actualItem[key];
        break;
      }
    }
  }

  const id = rawId != null ? String(rawId) : undefined;
  return {
    ...actualItem,
    ...(id !== undefined ? { id } : {})
  };
}

export function normalizeList(list, aliasKeys = []) {
  if (!list) return [];
  const array = Array.isArray(list)
    ? list
    : Array.isArray(list?.data)
      ? list.data
      : Array.isArray(list?.items)
        ? list.items
        : Array.isArray(list?.results)
          ? list.results
          : [];
  return array.map((item) => normalizeEntity(item, aliasKeys));
}

export function normalizeTournament(item) {
  return normalizeEntity(item, ['tournament_id', 'tournamentId']);
}

export function normalizeStage(item) {
  return normalizeEntity(item, ['tournament_game_id', 'tournamentGameId', 'stage_id', 'stageId']);
}

export function normalizeRegistration(item) {
  return normalizeEntity(item, ['registration_id', 'registrationId', 'player_id', 'playerId']);
}

export function normalizeMatch(item) {
  return normalizeEntity(item, ['match_id', 'matchId']);
}

export function normalizeChatMessage(item) {
  return normalizeEntity(item, ['message_id', 'messageId', 'chat_id', 'chatId']);
}

export function normalizeLeaderboard(data) {
  if (!data || typeof data !== 'object') return data;
  const item = normalizeEntity(data, ['tournament_id', 'tournamentId']);
  if (Array.isArray(item.standings)) {
    item.standings = item.standings.map((s) => normalizeEntity(s, ['player_id', 'playerId']));
  }
  return item;
}

export function normalizeBracket(data) {
  if (!data || typeof data !== 'object') return data;
  const item = normalizeEntity(data, ['tournament_id', 'tournamentId']);
  if (Array.isArray(item.matches)) {
    item.matches = item.matches.map((m) => normalizeMatch(m));
  }
  return item;
}

export function normalizeTournamentOverview(data) {
  if (!data || typeof data !== 'object') return data;
  const item = normalizeEntity(data, ['tournament_id', 'tournamentId']);
  if (Array.isArray(item.matches)) {
    item.matches = item.matches.map((m) => normalizeMatch(m));
  }
  if (Array.isArray(item.standings)) {
    item.standings = item.standings.map((s) => normalizeEntity(s, ['player_id', 'playerId']));
  }
  if (Array.isArray(item.stages)) {
    item.stages = item.stages.map((s) => normalizeStage(s));
  }
  if (item.overall_leaderboard && typeof item.overall_leaderboard === 'object') {
    item.overall_leaderboard = normalizeLeaderboard(item.overall_leaderboard);
  }
  return item;
}
