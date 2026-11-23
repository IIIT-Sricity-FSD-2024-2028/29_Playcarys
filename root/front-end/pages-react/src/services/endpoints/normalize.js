/**
 * Entity normalization utilities for API adapter boundary.
 * Normalizes entity IDs to { id, ... } and resolves aliases (user_id, game_id, tournament_id, etc.)
 */

export function normalizeEntity(item, aliasKeys = []) {
  if (!item || typeof item !== 'object') return item;
  const defaultAliasKeys = [
    'user_id', 'userId',
    'game_id', 'gameId',
    'tournament_id', 'tournamentId',
    'team_id', 'teamId',
    'group_id', 'groupId',
    'report_id', 'reportId',
    'notification_id', 'notificationId',
    'session_id', 'sessionId',
    'match_id', 'matchId',
    'payout_id', 'payoutId',
    'achievement_id', 'achievementId',
    'stage_id', 'stageId'
  ];
  const keysToCheck = [...aliasKeys, ...defaultAliasKeys];

  let rawId = item.id;
  if (rawId == null) {
    for (const key of keysToCheck) {
      if (item[key] != null) {
        rawId = item[key];
        break;
      }
    }
  }

  const id = rawId != null ? String(rawId) : undefined;
  return {
    ...item,
    ...(id !== undefined ? { id } : {})
  };
}

export function normalizeList(list, aliasKeys = []) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => normalizeEntity(item, aliasKeys));
}
