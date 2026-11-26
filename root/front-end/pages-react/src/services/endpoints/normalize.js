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
  if (!item || typeof item !== 'object') return item;
  const entity = normalizeEntity(item, [
    'registration_id',
    'registrationId',
    'player_id',
    'playerId',
    'team_id',
    'teamId'
  ]);

  const tournamentId =
    entity.tournamentId != null
      ? String(entity.tournamentId)
      : entity.tournament_id != null
        ? String(entity.tournament_id)
        : undefined;

  const playerId =
    entity.playerId != null
      ? String(entity.playerId)
      : entity.player_id != null
        ? String(entity.player_id)
        : undefined;

  const teamId =
    entity.teamId != null
      ? String(entity.teamId)
      : entity.team_id != null
        ? String(entity.team_id)
        : undefined;

  let rawId = entity.id || entity.registration_id;
  if (!rawId) {
    if (tournamentId && playerId) {
      rawId = `${tournamentId}_${playerId}`;
    } else if (tournamentId && teamId) {
      rawId = `${tournamentId}_team_${teamId}`;
    } else {
      rawId = playerId || teamId;
    }
  }

  return {
    ...entity,
    ...(rawId != null ? { id: String(rawId) } : {}),
    ...(tournamentId !== undefined ? { tournamentId } : {}),
    ...(playerId !== undefined ? { playerId } : {}),
    ...(teamId !== undefined ? { teamId } : {})
  };
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

export function normalizeReport(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const entity = normalizeEntity(raw, ['report_id', 'reportId']);
  const reason = entity.reason || entity.action_reason || entity.desc || '';
  const isContact = entity.type === 'Contact Admin' || entity.type === 'admin_contact';
  return {
    ...entity,
    desc: entity.desc || reason,
    reason: entity.reason || reason,
    reporterName: entity.reporterName || entity.reporter_name || (entity.reported_by ? `Player #${entity.reported_by}` : 'Anonymous'),
    reportedName: entity.reportedName || entity.reported_name || (entity.reported_user ? `Player #${entity.reported_user}` : (isContact ? 'None' : 'Unknown User')),
    session: entity.session || (entity.sessionId ? `Session #${entity.sessionId}` : 'General'),
    time: entity.time || entity.report_date || 'recently',
    isContact
  };
}

export function normalizeBan(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const entity = normalizeEntity(raw, ['ban_id', 'id']);
  const playerId = entity.playerId != null ? entity.playerId : entity.player_id;
  return {
    ...entity,
    playerId,
    playerName: entity.playerName || entity.player_name || (playerId ? `Player #${playerId}` : 'Unknown Player'),
    duration: entity.duration || '7 Days',
    reason: entity.reason || 'Violation of Community Guidelines',
    active: entity.active !== false
  };
}

export function normalizeModeratorAction(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  return normalizeEntity(raw, ['action_id', 'actionId']);
}

export function normalizeCatalogueItem(item) {
  if (!item || typeof item !== 'object') return item;
  const entity = normalizeEntity(item, ['item_id', 'id']);
  return {
    ...entity,
    owned: !!entity.owned,
    is_equipped: !!entity.is_equipped,
    price_carys: entity.price_carys != null ? Number(entity.price_carys) : null,
    price_paise: Number(entity.price_paise) || 0,
    price_display: entity.price_display || (entity.price_paise ? `₹${Math.round(entity.price_paise / 100)}` : 'Free')
  };
}

export function normalizeCatalogue(data) {
  if (!data || typeof data !== 'object') return data;
  return {
    balance_carys: Number(data.balance_carys) || 0,
    items: (data.items || []).map(normalizeCatalogueItem),
    plans: (data.plans || []).map((p) => normalizeEntity(p, ['plan_id', 'id'])),
    subscription: data.subscription ? normalizeEntity(data.subscription, ['subscription_id', 'id']) : null
  };
}

export function normalizeTransaction(tx) {
  if (!tx || typeof tx !== 'object') return tx;
  return normalizeEntity(tx, ['transaction_id', 'id']);
}

export function normalizeBalance(b) {
  if (!b || typeof b !== 'object') return b;
  return {
    user_id: b.user_id != null ? Number(b.user_id) : undefined,
    carys_points: Number(b.carys_points) || 0,
    carys_value_display: b.carys_value_display || '',
    ledger: b.ledger || []
  };
}

export function normalizePayout(payout) {
  if (!payout || typeof payout !== 'object') return payout;
  const entity = normalizeEntity(payout, ['payout_id', 'payoutId']);
  return {
    ...entity,
    payout_id: entity.payout_id != null ? Number(entity.payout_id) : (entity.id ? Number(entity.id) : undefined),
    publisher_id: entity.publisher_id != null ? Number(entity.publisher_id) : undefined,
    gross_paise: Number(entity.gross_paise) || 0,
    platform_cut_paise: Number(entity.platform_cut_paise) || 0,
    net_paise: Number(entity.net_paise) || 0,
    net_display: entity.net_display || (entity.net_paise ? `₹${Math.round(entity.net_paise / 100).toLocaleString('en-IN')}` : '₹0'),
    status: entity.status || 'pending',
    created_at: entity.created_at || entity.createdAt || ''
  };
}

export function normalizePublisherEarnings(data) {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    publisher_id: data.publisher_id != null ? Number(data.publisher_id) : undefined,
    available_paise: Number(data.available_paise) || 0,
    in_transit_paise: Number(data.in_transit_paise) || 0,
    paid_out_paise: Number(data.paid_out_paise) || 0,
    lifetime_earned_paise: Number(data.lifetime_earned_paise) || 0,
    reconciled: !!data.reconciled,
    active_payout: data.active_payout ? normalizePayout(data.active_payout) : null,
    history: Array.isArray(data.history) ? data.history.map(normalizePayout) : [],
    per_game: Array.isArray(data.per_game) ? data.per_game.map((g) => normalizeEntity(g, ['game_id', 'gameId'])) : [],
    unsettled: data.unsettled || null,
    withdraw: data.withdraw || {}
  };
}

export function normalizeAuditLog(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const entity = normalizeEntity(raw, ['log_id', 'id']);
  return {
    ...entity,
    id: entity.id != null ? String(entity.id) : (entity.log_id != null ? String(entity.log_id) : undefined),
    type: entity.type || 'system',
    msg: entity.msg || '',
    detail: entity.detail || '',
    actor: entity.actor || 'System',
    actor_role: entity.actor_role || '',
    at: entity.at || entity.timestamp || entity.created_at || new Date().toISOString()
  };
}




