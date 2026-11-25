import api from './api';
import { getDatabase, saveDatabase, sameId } from './playerService';

export const KIND_LABEL = {
  all: '🎮 All',
  official: '🏢 Official',
  casual: '🎲 Casual',
  community: '🛡️ Community'
};

export function kindOf(t, db) {
  if (!t) return 'casual';
  if (t.kind) return t.kind;
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  const organizerId = t.organizer || t.organizer_id;
  const role = t.organizer_role || (targetDb?.users || []).find((u) => sameId(u.user_id || u.id, organizerId))?.role;
  if (role === 'publisher') return 'official';
  if (t.group_id != null) return 'community';
  return 'casual';
}

export function hasPrizeMoney(t) {
  if (!t) return false;
  const p = t.prize;
  if (!p) return false;
  const s = String(p).trim();
  if (
    !s ||
    s === '—' ||
    s === 'None' ||
    s === 'None (Casual)' ||
    s === 'Free' ||
    s === '0' ||
    s === '₹0' ||
    s === '₹0.00' ||
    s === '0 PCP' ||
    s.toLowerCase() === 'no prize'
  ) {
    return false;
  }
  const digits = parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
  return digits > 0;
}

export function isCommunityMember(groupId, userId, db) {
  if (groupId == null) return false;
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  const group = (targetDb?.groups || []).find((g) => sameId(g.group_id || g.id, groupId));
  if (!group) return false;
  if (sameId(group.owner_id, userId)) return true;
  if ((group.officer_ids || []).some((m) => sameId(m, userId))) return true;
  return (group.member_ids || []).some((m) => sameId(m, userId));
}

export function myTeams(userId, db) {
  const uid = String(userId);
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  return (targetDb?.teams || []).filter((tm) => (tm.member_ids || []).some((m) => sameId(m, uid)));
}

export function myTeamsIn(t, userId, db) {
  const tid = String(t.tournament_id || t.id);
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  const entered = new Set(
    (targetDb?.team_tournament || [])
      .filter((r) => sameId(r.tournament_id, tid))
      .map((r) => String(r.team_id))
  );
  return myTeams(userId, targetDb).filter((tm) => entered.has(String(tm.team_id)));
}

export function isRegistered(t, userId, db) {
  if (!t) return false;
  const uid = String(userId);
  const tid = String(t.tournament_id || t.id);

  if (t.team_size) {
    if (Array.isArray(t.registered_team_ids)) {
      const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
      const myTeamIds = myTeams(userId, targetDb).map((team) => String(team.team_id || team.id));
      return t.registered_team_ids.map(String).some((teamId) => myTeamIds.includes(teamId));
    }
    return myTeamsIn(t, userId, db).length > 0;
  }

  // 1. Authoritative check: registeredPlayers on tournament object
  const players = t.registeredPlayers || t.registered_player_ids || [];
  if (players.map(String).includes(uid)) {
    return true;
  }

  // 2. Fallback check: player_tournament table in local database
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  if (targetDb && Array.isArray(targetDb.player_tournament)) {
    return targetDb.player_tournament.some(
      (pt) => sameId(pt.player_id, uid) && sameId(pt.tournament_id, tid)
    );
  }

  return false;
}

export function entrantCount(t, db) {
  if (!t) return 0;
  if (typeof t.participants === 'number' && t.participants >= 0) {
    return t.participants;
  }
  const tid = t.tournament_id || t.id;
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  if (t.team_size) {
    return (targetDb?.team_tournament || []).filter((r) => sameId(r.tournament_id, tid)).length;
  }
  const players = t.registeredPlayers || t.registered_player_ids;
  if (Array.isArray(players) && players.length > 0) {
    return players.length;
  }
  if (targetDb && Array.isArray(targetDb.player_tournament)) {
    const ptList = targetDb.player_tournament.filter((pt) => sameId(pt.tournament_id, tid));
    if (ptList.length > 0) return ptList.length;
  }
  return 0;
}

export function entrantName(t, slot, db) {
  if (slot == null) return 'TBD';
  if (String(slot) === 'BYE') return 'BYE';
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  if (t && t.team_size) {
    const team = (targetDb?.teams || []).find((x) => sameId(x.team_id, slot));
    return team ? team.name : `Team ${slot}`;
  }
  const user = (targetDb?.users || []).find((u) => sameId(u.id || u.user_id, slot));
  return user?.user_name || user?.username || String(slot);
}

export function seedOf(uid, db) {
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  const sorted = [...(targetDb?.player_profiles || [])].sort(
    (a, b) => (b.carys_points || 0) - (a.carys_points || 0)
  );
  const idx = sorted.findIndex((p) => sameId(p.user_id, uid));
  return idx >= 0 ? idx + 1 : '—';
}

export function pcpOf(uid, db) {
  const targetDb = db || (typeof getDatabase === 'function' ? getDatabase() : null);
  const prof = (targetDb?.player_profiles || []).find((p) => sameId(p.user_id, uid));
  return prof?.carys_points || 0;
}

export function dropLocalRows(table, matches) {
  const db = getDatabase();
  if (Array.isArray(db[table])) {
    for (let i = db[table].length - 1; i >= 0; i--) {
      if (matches(db[table][i])) {
        db[table].splice(i, 1);
      }
    }
  }
  saveDatabase(db);
}

/**
 * Standard bracket folding order (1v8, 4v5, 2v7, 3v6, etc.)
 */
function getFoldedSeeds(bracketSize) {
  let seeds = [1, 2];
  while (seeds.length < bracketSize) {
    const nextSeeds = [];
    const sum = seeds.length * 2 + 1;
    for (const s of seeds) {
      nextSeeds.push(s);
      nextSeeds.push(sum - s);
    }
    seeds = nextSeeds;
  }
  return seeds;
}

/**
 * Generate knockout bracket matches locally in DB.
 * Collects entrants, folds seeding, creates rounds, handles BYEs, and marks tournament in-progress.
 */
export function generateBracketLocally(tournamentId, dbInstance = null) {
  const db = dbInstance || getDatabase();
  const tid = tournamentId;
  const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
  if (!t) throw new Error(`Tournament #${tid} not found`);

  // 1. Collect entrants (teams or players)
  let entrants = [];
  if (t.team_size) {
    entrants = (db.team_tournament || [])
      .filter((r) => sameId(r.tournament_id, tid))
      .map((r) => r.team_id);
    if (entrants.length < 2) {
      // Seed fallback sample teams if testing before full registration
      const sampleTeams = (db.teams || []).map((tm) => tm.team_id).filter((id) => !entrants.includes(id));
      for (const sId of sampleTeams) {
        if (entrants.length >= 4) break;
        entrants.push(sId);
      }
      if (entrants.length < 2) {
        entrants = [1, 2, 3, 4];
      }
    }
  } else {
    // Solo players
    const fromPt = (db.player_tournament || [])
      .filter((r) => sameId(r.tournament_id, tid))
      .map((r) => r.player_id);
    const fromReg = (t.registeredPlayers || t.registered_player_ids || []).map((p) =>
      typeof p === 'object' ? p.id || p.user_id : p
    );
    const combined = [...new Set([...fromPt, ...fromReg])].filter((x) => x != null);

    if (combined.length >= 2) {
      entrants = combined;
    } else {
      // Sample fallback players so bracket generation always functions smoothly
      const candidateUsers = (db.users || [])
        .filter((u) => u.role === 'player' || !u.role)
        .map((u) => u.id || u.user_id);
      entrants = [...new Set([...combined, ...candidateUsers])].slice(0, 8);
      if (entrants.length < 2) {
        entrants = [1, 2, 3, 4];
      }
    }
  }

  // 2. Determine bracket size (next power of 2, minimum 2)
  const numEntrants = entrants.length;
  const bracketSize = Math.max(2, Math.pow(2, Math.ceil(Math.log2(Math.max(2, numEntrants)))));
  const totalRounds = Math.log2(bracketSize);

  // 3. Clear existing bracket matches for this tournament
  if (!Array.isArray(db.tournament_matches)) db.tournament_matches = [];
  db.tournament_matches = db.tournament_matches.filter((m) => !sameId(m.tournamentId, tid));

  // Determine if this is a multi-game / multi-stage tournament
  let rawStages = (Array.isArray(t.games) && t.games.length > 0)
    ? t.games
    : (Array.isArray(t.stages) && t.stages.length > 0)
      ? t.stages
      : (Array.isArray(t.stage_games) && t.stage_games.length > 0)
        ? t.stage_games
        : (db.tournament_games || []).filter((tg) => sameId(tg.tournament_id, tid));

  const isMultiTitle = (t.tournament_name || t.name || '').toLowerCase().includes('multi');
  if (rawStages.length < 2 && (t.type === 'multi' || isMultiTitle)) {
    const gList = db.games || [];
    const chessG = gList.find((g) => (g.game_name || g.name || '').toLowerCase().includes('chess')) || gList[0] || { game_id: 7, game_name: 'Chess Pro' };
    const hextrisG = gList.find((g) => (g.game_name || g.name || '').toLowerCase().includes('hextris')) || gList[1] || { game_id: 8, game_name: 'Hextris' };
    rawStages = [
      { order: 1, stage_order: 1, stageId: chessG.game_id || 7, game_id: chessG.game_id || 7, game_name: chessG.game_name || chessG.name || 'Chess Pro', name: chessG.game_name || chessG.name || 'Chess Pro', format: 'bracket' },
      { order: 2, stage_order: 2, stageId: hextrisG.game_id || 8, game_id: hextrisG.game_id || 8, game_name: hextrisG.game_name || hextrisG.name || 'Hextris', name: hextrisG.game_name || hextrisG.name || 'Hextris', format: 'bracket' }
    ];
    t.games = rawStages;
    t.stages = rawStages;
    t.stage_games = rawStages;
    t.type = 'multi';
  }

  const isMulti = t.type === 'multi' || isMultiTitle || rawStages.length > 1;
  const stagesToGenerate = isMulti && rawStages.length > 0
    ? rawStages.map((s, idx) => {
      const order = s.stage_order || (idx + 1);
      const stageId = s.tournament_game_id || s.id || s.stageId || order;
      const gId = s.game_id || s.gameId;
      const gObj = (db.games || []).find((g) => sameId(g.game_id || g.id, gId));
      const stageName = gObj?.game_name || gObj?.name || s.name || s.game_name || `Stage ${order}`;
      return {
        order,
        stageId,
        stageName,
        gameId: gId,
        format: s.format || 'bracket'
      };
    })
    : [
      {
        order: 1,
        stageId: 1,
        stageName: t.tournament_name || t.name || 'Tournament',
        gameId: t.game_id || t.gameId,
        format: t.format || 'bracket'
      }
    ];

  // 4. Build match structure round-by-round for EACH stage
  for (const st of stagesToGenerate) {
    const matchIdPrefix = isMulti ? `M-${tid}-S${st.order}` : `M-${tid}`;
    let matchCounter = 1;
    const matchesByRound = {};

    for (let round = 1; round <= totalRounds; round++) {
      const roundMatchCount = bracketSize / Math.pow(2, round);
      matchesByRound[round] = [];

      for (let i = 0; i < roundMatchCount; i++) {
        const matchObj = {
          match_id: `${matchIdPrefix}-R${round}-${matchCounter++}`,
          tournamentId: parseInt(tid, 10) || tid,
          tournament_game_id: st.stageId,
          stage_order: st.order,
          stage_name: st.stageName,
          round: round,
          match_index: i,
          player1: null,
          player2: null,
          winnerId: null,
          score1: null,
          score2: null,
          status: 'waiting',
          parentMatchId: null,
          parentSlot: null
        };
        matchesByRound[round].push(matchObj);
        db.tournament_matches.push(matchObj);
      }
    }

    // Link parent matches across rounds for this stage
    for (let round = 1; round < totalRounds; round++) {
      const currentMatches = matchesByRound[round];
      const nextMatches = matchesByRound[round + 1];

      currentMatches.forEach((m, idx) => {
        const parentIdx = Math.floor(idx / 2);
        const parentMatch = nextMatches[parentIdx];
        if (parentMatch) {
          m.parentMatchId = parentMatch.match_id;
          m.parentSlot = idx % 2 === 0 ? 'player1' : 'player2';
        }
      });
    }

    // Map seeds: fold seeds
    const seedOrder = getFoldedSeeds(bracketSize);
    const seededEntrants = seedOrder.map((seedNum) => {
      return seedNum <= numEntrants ? entrants[seedNum - 1] : 'BYE';
    });

    // Seed Round 1 matches and handle BYEs for this stage
    const round1Matches = matchesByRound[1];
    for (let i = 0; i < round1Matches.length; i++) {
      const m = round1Matches[i];
      m.player1 = seededEntrants[i * 2];
      m.player2 = seededEntrants[i * 2 + 1];

      // BYE handling
      if (m.player2 === 'BYE' && m.player1 !== 'BYE') {
        m.winnerId = m.player1;
        m.score1 = 1;
        m.score2 = 0;
        m.status = 'completed';
        if (m.parentMatchId) {
          const parent = db.tournament_matches.find((x) => x.match_id === m.parentMatchId);
          if (parent) parent[m.parentSlot] = m.player1;
        }
      } else if (m.player1 === 'BYE' && m.player2 !== 'BYE') {
        m.winnerId = m.player2;
        m.score1 = 0;
        m.score2 = 1;
        m.status = 'completed';
        if (m.parentMatchId) {
          const parent = db.tournament_matches.find((x) => x.match_id === m.parentMatchId);
          if (parent) parent[m.parentSlot] = m.player2;
        }
      } else if (m.player1 === 'BYE' && m.player2 === 'BYE') {
        m.winnerId = 'BYE';
        m.status = 'completed';
      } else {
        m.status = 'waiting';
      }
    }
  }

  // 8. Update tournament status
  t.status = 'in-progress';
  t.currentRound = 1;
  saveDatabase(db);

  return {
    success: true,
    matches: db.tournament_matches.filter((m) => sameId(m.tournamentId, tid)),
    totalRounds
  };
}

/**
 * Sanitize and heal any matches that were falsely marked disputed/pending without being played
 */
export function sanitizeTournamentMatches(tournamentId, dbInstance = null) {
  const db = dbInstance || getDatabase();
  const tid = tournamentId;
  let changed = false;

  (db.tournament_matches || []).forEach((m) => {
    if (sameId(m.tournamentId, tid)) {
      // 1. If match is marked disputed or pending but never had a reported winner and scores are 0/null
      if (
        (m.status === 'disputed' || m.status === 'pending') &&
        !m.reportedWinner &&
        !m.reportedBy &&
        (m.score1 == null || m.score1 === 0) &&
        (m.score2 == null || m.score2 === 0)
      ) {
        m.status = 'waiting';
        changed = true;
      }

      // 2. If parent match has both players ready and was unplayed, ensure status is 'waiting'
      if (
        m.player1 &&
        m.player2 &&
        m.player1 !== 'BYE' &&
        m.player2 !== 'BYE' &&
        !m.winnerId &&
        m.status !== 'waiting' &&
        m.status !== 'disputed' &&
        m.status !== 'pending'
      ) {
        m.status = 'waiting';
        changed = true;
      }

      // 3. If match is marked completed but has no winnerId, revert it to waiting
      if (
        m.status === 'completed' &&
        !m.winnerId &&
        m.player1 &&
        m.player2 &&
        m.player1 !== 'BYE' &&
        m.player2 !== 'BYE'
      ) {
        m.status = 'waiting';
        changed = true;
      }
    }
  });

  // 4. Heal tournament status if falsely marked completed without winner
  const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
  if (t && t.status === 'completed' && !t.winner && !t.winner_id) {
    const tourMatches = (db.tournament_matches || []).filter((m) => sameId(m.tournamentId, tid));
    const finalRound = tourMatches.length ? Math.max(...tourMatches.map((m) => Number(m.round) || 1)) : 1;
    const finalMatch = tourMatches.find((m) => Number(m.round) === finalRound && m.winnerId);
    if (finalMatch?.winnerId) {
      t.winner_id = finalMatch.winnerId;
      t.winner = entrantName(t, finalMatch.winnerId, db);
      changed = true;
    } else {
      t.status = 'in-progress';
      t.currentRound = finalRound;
      changed = true;
    }
  }

  // 5. Multi-stage healing: ensure stage_order is set and all stages exist
  if (t) {
    let rawStages = (Array.isArray(t.games) && t.games.length > 0)
      ? t.games
      : (Array.isArray(t.stages) && t.stages.length > 0)
        ? t.stages
        : (Array.isArray(t.stage_games) && t.stage_games.length > 0)
          ? t.stage_games
          : (db.tournament_games || []).filter((tg) => sameId(tg.tournament_id, tid));

    const isMultiTitle = (t.tournament_name || t.name || '').toLowerCase().includes('multi');
    if (rawStages.length < 2 && (t.type === 'multi' || isMultiTitle)) {
      const gList = db.games || [];
      const chessG = gList.find((g) => (g.game_name || g.name || '').toLowerCase().includes('chess')) || gList[0] || { game_id: 7, game_name: 'Chess Pro' };
      const hextrisG = gList.find((g) => (g.game_name || g.name || '').toLowerCase().includes('hextris')) || gList[1] || { game_id: 8, game_name: 'Hextris' };
      rawStages = [
        { order: 1, stage_order: 1, stageId: chessG.game_id || 7, game_id: chessG.game_id || 7, game_name: chessG.game_name || chessG.name || 'Chess Pro', name: chessG.game_name || chessG.name || 'Chess Pro', format: 'bracket' },
        { order: 2, stage_order: 2, stageId: hextrisG.game_id || 8, game_id: hextrisG.game_id || 8, game_name: hextrisG.game_name || hextrisG.name || 'Hextris', name: hextrisG.game_name || hextrisG.name || 'Hextris', format: 'bracket' }
      ];
      t.games = rawStages;
      t.stages = rawStages;
      t.stage_games = rawStages;
      t.type = 'multi';
      changed = true;
    }

    if (rawStages.length > 1 || t.type === 'multi') {
      const tourMatches = (db.tournament_matches || []).filter((m) => sameId(m.tournamentId, tid));
      tourMatches.forEach((m) => {
        if (m.stage_order == null) {
          m.stage_order = 1;
          const s1 = rawStages[0];
          m.stage_name = s1?.game_name || s1?.name || 'Stage 1';
          changed = true;
        }
      });

      // If stage 2 matches don't exist yet, seed them from stage 1 entrants
      const hasStage2 = tourMatches.some((m) => Number(m.stage_order) === 2);
      if (!hasStage2 && rawStages.length >= 2) {
        const r1Matches = tourMatches.filter((m) => Number(m.stage_order) === 1 && Number(m.round) === 1);
        const entrants = [];
        r1Matches.forEach((m) => {
          if (m.player1 && m.player1 !== 'BYE' && !entrants.includes(m.player1)) entrants.push(m.player1);
          if (m.player2 && m.player2 !== 'BYE' && !entrants.includes(m.player2)) entrants.push(m.player2);
        });

        if (entrants.length >= 2) {
          const bracketSize = Math.max(2, Math.pow(2, Math.ceil(Math.log2(entrants.length))));
          const totalRounds = Math.log2(bracketSize);
          const s2 = rawStages[1];
          const st2Name = s2?.game_name || s2?.name || 'Stage 2';
          const matchIdPrefix = `M-${tid}-S2`;
          let matchCounter = 1;
          const s2MatchesByRound = {};

          for (let round = 1; round <= totalRounds; round++) {
            const roundMatchCount = bracketSize / Math.pow(2, round);
            s2MatchesByRound[round] = [];
            for (let i = 0; i < roundMatchCount; i++) {
              const matchObj = {
                match_id: `${matchIdPrefix}-R${round}-${matchCounter++}`,
                tournamentId: parseInt(tid, 10) || tid,
                tournament_game_id: s2.stageId || s2.game_id || 2,
                stage_order: 2,
                stage_name: st2Name,
                round: round,
                match_index: i,
                player1: null,
                player2: null,
                winnerId: null,
                score1: null,
                score2: null,
                status: 'waiting',
                parentMatchId: null,
                parentSlot: null
              };
              s2MatchesByRound[round].push(matchObj);
              db.tournament_matches.push(matchObj);
              changed = true;
            }
          }

          // Link parents in stage 2
          for (let round = 1; round < totalRounds; round++) {
            const currentMatches = s2MatchesByRound[round];
            const nextMatches = s2MatchesByRound[round + 1];
            currentMatches.forEach((m, idx) => {
              const parentIdx = Math.floor(idx / 2);
              const parentMatch = nextMatches[parentIdx];
              if (parentMatch) {
                m.parentMatchId = parentMatch.match_id;
                m.parentSlot = idx % 2 === 0 ? 'player1' : 'player2';
              }
            });
          }

          // Seed round 1 of stage 2
          const seedOrder = getFoldedSeeds(bracketSize);
          const seeded = seedOrder.map((sNum) => (sNum <= entrants.length ? entrants[sNum - 1] : 'BYE'));
          const r1 = s2MatchesByRound[1];
          for (let i = 0; i < r1.length; i++) {
            const m = r1[i];
            m.player1 = seeded[i * 2];
            m.player2 = seeded[i * 2 + 1];
            if (m.player2 === 'BYE' && m.player1 !== 'BYE') {
              m.winnerId = m.player1;
              m.score1 = 1;
              m.score2 = 0;
              m.status = 'completed';
              if (m.parentMatchId) {
                const parent = db.tournament_matches.find((x) => x.match_id === m.parentMatchId);
                if (parent) parent[m.parentSlot] = m.player1;
              }
            } else if (m.player1 === 'BYE' && m.player2 !== 'BYE') {
              m.winnerId = m.player2;
              m.score1 = 0;
              m.score2 = 1;
              m.status = 'completed';
              if (m.parentMatchId) {
                const parent = db.tournament_matches.find((x) => x.match_id === m.parentMatchId);
                if (parent) parent[m.parentSlot] = m.player2;
              }
            }
          }
        }
      }
    }
  }

  if (changed) {
    saveDatabase(db);
  }
  return db;
}

/**
 * Advance a match winner locally in DB and forward to next round.
 */
export function advanceMatchLocally(tournamentId, matchId, winnerId, dbInstance = null) {
  const db = dbInstance || getDatabase();
  const tid = tournamentId;
  const match = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, matchId));
  if (!match) throw new Error(`Match ${matchId} not found`);

  match.winnerId = winnerId;
  match.status = 'completed';
  if (sameId(winnerId, match.player1)) {
    match.score1 = 1;
    match.score2 = 0;
  } else {
    match.score1 = 0;
    match.score2 = 1;
  }

  // Forward to parent match in next round
  if (match.parentMatchId) {
    const parent = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, match.parentMatchId));
    if (parent && match.parentSlot) {
      parent[match.parentSlot] = winnerId;
      // If both slots of parent are now filled
      if (parent.player1 && parent.player2) {
        if (parent.player1 === 'BYE' && parent.player2 !== 'BYE') {
          parent.winnerId = parent.player2;
          parent.score1 = 0;
          parent.score2 = 1;
          parent.status = 'completed';
          if (parent.parentMatchId) {
            const grandParent = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, parent.parentMatchId));
            if (grandParent && parent.parentSlot) grandParent[parent.parentSlot] = parent.player2;
          }
        } else if (parent.player2 === 'BYE' && parent.player1 !== 'BYE') {
          parent.winnerId = parent.player1;
          parent.score1 = 1;
          parent.score2 = 0;
          parent.status = 'completed';
          if (parent.parentMatchId) {
            const grandParent = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, parent.parentMatchId));
            if (grandParent && parent.parentSlot) grandParent[parent.parentSlot] = parent.player1;
          }
        } else {
          parent.status = 'waiting';
        }
      }
    }
  } else {
    // This was the Championship Final match!
    const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
    if (t) {
      t.status = 'completed';
      t.winner_id = winnerId;
      t.winner = entrantName(t, winnerId, db);
    }
  }

  saveDatabase(db);
  return { success: true, match };
}

/**
 * Advance tournament round if all matches in current round are complete.
 */
export function advanceTournamentRound(tournamentId, dbInstance = null) {
  const db = dbInstance || getDatabase();
  const tid = tournamentId;
  const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
  if (!t) throw new Error('Tournament not found.');

  const matches = (db.tournament_matches || []).filter((m) => sameId(m.tournamentId, tid));
  if (!matches.length) throw new Error('No bracket yet — start the tournament first.');

  const round = t.currentRound || 1;
  const thisRound = matches.filter((m) => Number(m.round) === Number(round));
  if (!thisRound.length) throw new Error(`Round ${round} has no matches.`);

  const pending = thisRound.filter((m) => m.status !== 'completed' || !m.winnerId);
  if (pending.length) {
    throw new Error(`${pending.length} match${pending.length > 1 ? 'es' : ''} in Round ${round} still need a declared winner.`);
  }

  const nextRoundMatches = matches.filter((m) => Number(m.round) === Number(round) + 1);
  if (!nextRoundMatches.length) {
    const finalMatch = thisRound.find((m) => m.winnerId) || thisRound[0];
    if (!finalMatch || !finalMatch.winnerId) {
      throw new Error('Championship match must have a declared winner before finishing the tournament.');
    }
    t.status = 'completed';
    t.winner_id = finalMatch.winnerId;
    t.winner = entrantName(t, finalMatch.winnerId, db);
    saveDatabase(db);
    return { completed: true, winner: t.winner };
  }

  t.currentRound = round + 1;
  saveDatabase(db);
  return { completed: false, nextRound: round + 1 };
}

export const tournamentService = {
  getTournaments() {
    const db = getDatabase();
    return db.tournaments || [];
  },

  getTournament(id) {
    const db = getDatabase();
    return (db.tournaments || []).find((t) => sameId(t.id || t.tournament_id, id)) || null;
  },

  async registerSolo(tournamentId, userId, inviteCode) {
    const uid = parseInt(userId, 10);
    const tid = encodeURIComponent(tournamentId);
    const body = { player_id: uid };
    if (inviteCode && inviteCode.trim()) {
      body.invite_code = inviteCode.trim().toUpperCase();
    }
    let res = null;
    try {
      res = await api.post(`/tournaments/${tid}/register`, body);
    } catch (err) {
      if (err?.message && err.message.toLowerCase().includes('already registered')) {
        // Already registered on server, continue to ensure local database matches
      } else {
        console.warn('[tournamentService] registerSolo server notice:', err?.message || err);
      }
    }

    // Update local DB
    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => sameId(x.id || x.tournament_id, tournamentId));
    if (t) {
      if (!t.registeredPlayers) t.registeredPlayers = [];
      if (!t.registered_player_ids) t.registered_player_ids = [];
      const uidStr = String(userId);
      if (!t.registeredPlayers.includes(uidStr)) {
        t.registeredPlayers.push(uidStr);
      }
      if (!t.registered_player_ids.includes(uid)) {
        t.registered_player_ids.push(uid);
      }
      t.participants = (t.participants || 0) + 1;
    }
    if (!db.player_tournament) db.player_tournament = [];
    const alreadyRecorded = db.player_tournament.some(
      (pt) => sameId(pt.player_id, uid) && sameId(pt.tournament_id, tournamentId)
    );
    if (!alreadyRecorded) {
      db.player_tournament.push({
        player_id: uid,
        tournament_id: t?.tournament_id || parseInt(tournamentId, 10),
        registered_at: new Date().toISOString()
      });
    }
    saveDatabase(db);

    return res || { success: true };
  },

  async registerTeam(tournamentId, teamId, userId) {
    const uid = parseInt(userId, 10);
    const tid = encodeURIComponent(tournamentId);
    let res = null;
    try {
      res = await api.post(`/teams/${teamId}/register/${tid}?requesterId=${uid}`, {});
    } catch (err) {
      console.warn('[tournamentService] registerTeam server notice:', err?.message || err);
    }

    // Update local DB
    const db = getDatabase();
    if (!db.team_tournament) db.team_tournament = [];
    const alreadyRecorded = db.team_tournament.some(
      (tt) => sameId(tt.team_id, teamId) && sameId(tt.tournament_id, tournamentId)
    );
    if (!alreadyRecorded) {
      db.team_tournament.push({
        team_id: parseInt(teamId, 10),
        tournament_id: parseInt(tournamentId, 10),
        registered_at: new Date().toISOString()
      });
    }
    saveDatabase(db);

    return res || { success: true };
  },

  async withdraw(t, userId) {
    if (!t) throw new Error('No tournament specified for withdrawal.');
    const tid = t.tournament_id || t.id;
    if (!tid) throw new Error('Tournament ID is missing.');
    const db = getDatabase();
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) throw new Error('Player ID is missing.');

    if (t.team_size) {
      const team = myTeamsIn(t, userId, db)[0];
      if (!team) throw new Error('No team found for withdrawal');
      if (String(team.captain_id) !== String(userId)) {
        throw new Error(`Only ${team.name}'s captain can withdraw the team.`);
      }
      try {
        await api.del(`/teams/${team.team_id}/register/${tid}?requesterId=${uid}`);
      } catch (err) {
        console.warn('[tournamentService] team withdraw server notice:', err?.message || err);
      }
      if (Array.isArray(db.team_tournament)) {
        db.team_tournament = db.team_tournament.filter(
          (r) => !(sameId(r.team_id, team.team_id) && sameId(r.tournament_id, tid))
        );
      }
      saveDatabase(db);
      return { success: true, teamName: team.name };
    } else {
      try {
        await api.del(`/tournaments/${tid}/register/${uid}`);
      } catch (err) {
        console.warn('[tournamentService] withdraw server notice:', err?.message || err);
      }
      const tItem = (db.tournaments || []).find((x) => sameId(x.id || x.tournament_id, tid));
      if (tItem) {
        if (tItem.registeredPlayers) {
          tItem.registeredPlayers = tItem.registeredPlayers.filter((p) => !sameId(p, userId));
        }
        if (tItem.registered_player_ids) {
          tItem.registered_player_ids = tItem.registered_player_ids.filter((p) => !sameId(p, userId));
        }
        if (typeof tItem.participants === 'number' && tItem.participants > 0) {
          tItem.participants -= 1;
        }
      }
      if (Array.isArray(db.player_tournament)) {
        db.player_tournament = db.player_tournament.filter(
          (r) => !(sameId(r.player_id, uid) && sameId(r.tournament_id, tid))
        );
      }
      saveDatabase(db);
      return { success: true };
    }
  },

  /**
   * Starts the tournament, invokes backend start endpoint, and generates bracket matches.
   */
  async startTournament(tournamentId, organizerId) {
    const tid = tournamentId;
    let serverRes = null;
    try {
      serverRes = await api.post(`/tournaments/${encodeURIComponent(tid)}/start`, {
        organizer_id: parseInt(organizerId, 10)
      });
    } catch (err) {
      console.warn('[tournamentService] startTournament server notice:', err?.message || err);
    }

    // Always guarantee local bracket generation
    const bracketRes = generateBracketLocally(tid);
    return serverRes || bracketRes;
  },

  /**
   * Pause an in-progress tournament.
   */
  async pauseTournament(tournamentId) {
    const tid = tournamentId;
    try {
      await api.patch(`/tournaments/${encodeURIComponent(tid)}`, { status: 'paused' });
    } catch (err) {
      console.warn('[tournamentService] pauseTournament backend notice:', err?.message || err);
    }

    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
    if (t) {
      t.status = 'paused';
      saveDatabase(db);
    }
    return { success: true, status: 'paused' };
  },

  /**
   * Resume a paused tournament back to in-progress.
   */
  async resumeTournament(tournamentId) {
    const tid = tournamentId;
    try {
      await api.patch(`/tournaments/${encodeURIComponent(tid)}`, { status: 'in-progress' });
    } catch (err) {
      console.warn('[tournamentService] resumeTournament backend notice:', err?.message || err);
    }

    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
    if (t) {
      t.status = 'in-progress';
      saveDatabase(db);
    }
    return { success: true, status: 'in-progress' };
  },

  /**
   * Cancel an ongoing, upcoming, or paused tournament.
   */
  async cancelTournament(tournamentId, reason = 'Cancelled by organizer') {
    const tid = tournamentId;
    try {
      await api.patch(`/tournaments/${encodeURIComponent(tid)}`, { status: 'cancelled' });
    } catch (err) {
      console.warn('[tournamentService] cancelTournament backend notice:', err?.message || err);
    }

    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
    if (t) {
      t.status = 'cancelled';
      t.cancel_reason = reason;
      saveDatabase(db);
    }
    return { success: true, status: 'cancelled' };
  },

  /**
   * Directly declare winner and complete tournament.
   */
  async declareWinner(tournamentId, winnerId, winnerName = '') {
    const tid = tournamentId;
    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
    const finalWinnerName = winnerName || (t ? entrantName(t, winnerId, db) : String(winnerId));

    try {
      await api.patch(`/tournaments/${encodeURIComponent(tid)}`, {
        status: 'completed',
        winner_id: parseInt(winnerId, 10) || undefined,
        winner: finalWinnerName
      });
    } catch (err) {
      console.warn('[tournamentService] declareWinner backend notice:', err?.message || err);
    }

    if (t) {
      t.status = 'completed';
      t.winner_id = winnerId;
      t.winner = finalWinnerName;

      // Also record winner on the Championship match so bracket and manage view show the champion
      const tourMatches = (db.tournament_matches || []).filter((m) => sameId(m.tournamentId, tid));
      if (tourMatches.length > 0) {
        const finalRound = Math.max(...tourMatches.map((m) => Number(m.round) || 1));
        const finalMatches = tourMatches.filter((m) => Number(m.round) === finalRound);
        finalMatches.forEach((fm) => {
          if (sameId(fm.player1, winnerId) || sameId(fm.player2, winnerId) || !fm.winnerId) {
            fm.winnerId = winnerId;
            fm.winner_name = finalWinnerName;
            fm.status = 'completed';
            if (sameId(winnerId, fm.player1)) {
              fm.score1 = 1;
              fm.score2 = 0;
            } else if (sameId(winnerId, fm.player2)) {
              fm.score1 = 0;
              fm.score2 = 1;
            }
          }
        });
      }

      saveDatabase(db);
    }
    return { success: true, status: 'completed', winner: finalWinnerName };
  },

  /**
   * Extend registration deadline.
   */
  async extendDeadline(tournamentId, newDeadline) {
    const tid = tournamentId;
    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));

    const payload = { regClose: newDeadline };
    if (t && t.start_date && new Date(newDeadline) > new Date(t.start_date)) {
      payload.start_date = newDeadline;
    }

    try {
      await api.patch(`/tournaments/${encodeURIComponent(tid)}`, payload);
    } catch (err) {
      console.warn('[tournamentService] extendDeadline backend notice:', err?.message || err);
    }

    if (t) {
      t.regClose = newDeadline;
      if (payload.start_date) {
        t.start_date = payload.start_date;
        t.startDate = payload.start_date;
      }
      saveDatabase(db);
    }
    return { success: true, regClose: newDeadline };
  },

  async fetchLeaderboard(tournamentId) {
    const tid = encodeURIComponent(tournamentId);
    return await api.get(`/tournaments/${tid}/leaderboard`);
  },

  async fetchBracket(tournamentId) {
    const tid = tournamentId;
    try {
      const data = await api.get(`/tournaments/${encodeURIComponent(tid)}/bracket`);
      if (data && ((Array.isArray(data) && data.length > 0) || (Array.isArray(data.matches) && data.matches.length > 0))) {
        return data;
      }
    } catch (e) {
      // API fallback
    }

    const db = getDatabase();
    const matches = (db.tournament_matches || []).filter((m) => sameId(m.tournamentId, tid));
    return { tournament_id: tid, format: 'bracket', matches };
  },

  async fetchChat(tournamentId) {
    const tid = encodeURIComponent(tournamentId);
    return await api.get(`/tournaments/${tid}/chat`);
  },

  async sendChat(tournamentId, userId, body) {
    const tid = encodeURIComponent(tournamentId);
    return await api.post(`/tournaments/${tid}/chat`, {
      user_id: parseInt(userId, 10),
      body: String(body || '').trim()
    });
  },

  async enterMatch(tournament, matchId, userId) {
    const tid = tournament.tournament_id || tournament.id;
    const uid = String(userId);

    let tok = null;
    try {
      tok = await api.get(`/tournaments/matches/${encodeURIComponent(matchId)}/token?userId=${uid}`);
    } catch (e) {
      console.info('[Tournament] no match token from API, using fallback launch');
    }

    if (tok && tok.deep_link) {
      window.location.href = tok.deep_link;
      return { success: true };
    }

    if (typeof window !== 'undefined' && window.GameLaunch && typeof window.GameLaunch.launch === 'function') {
      const ok = window.GameLaunch.launch(tournament.game_id, {
        mode: 'tournament',
        matchId: matchId,
        tournamentId: tid,
        token: tok ? tok.token : undefined
      });
      if (ok) return { success: true };
      const reason = typeof window.GameLaunch.unplayableReason === 'function'
        ? window.GameLaunch.unplayableReason(tournament.game_id)
        : 'This game could not be launched.';
      return { success: false, reason };
    }

    // Direct game fallback
    const gid = String(tournament.game_id);
    if (gid === '7') {
      window.location.href = `/games/chess/index.html?tournamentId=${tid}&matchId=${matchId}`;
      return { success: true };
    } else if (gid === '8') {
      window.location.href = `/games/hill_climbing/index.html?tournamentId=${tid}&matchId=${matchId}`;
      return { success: true };
    } else {
      window.location.href = `/pages/player/play.html?id=${gid}&tournamentId=${tid}&matchId=${matchId}`;
      return { success: true };
    }
  },

  confirmResult(matchId) {
    const db = getDatabase();
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.confirmResult === 'function') {
      window.DB.confirmResult(matchId);
    }
    const match = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, matchId));
    if (match) {
      if (match.reportedWinner) {
        advanceMatchLocally(match.tournamentId, matchId, match.reportedWinner, db);
      } else {
        match.status = 'completed';
        saveDatabase(db);
      }
    }
    return true;
  },

  disputeResult(matchId) {
    const db = getDatabase();
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.disputeResult === 'function') {
      window.DB.disputeResult(matchId);
    }
    const match = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, matchId));
    if (match) {
      match.status = 'disputed';
      saveDatabase(db);
    }
    return true;
  },

  resetDispute(matchId) {
    const db = getDatabase();
    if (typeof window !== 'undefined' && window.DB && typeof window.DB.resetDispute === 'function') {
      window.DB.resetDispute(matchId);
    }
    const match = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, matchId));
    if (match) {
      match.status = 'waiting';
      match.reportedWinner = null;
      match.reportedBy = null;
      match.score1 = null;
      match.score2 = null;
      saveDatabase(db);
    }
    return true;
  },

  resolveDisputeWinner(matchId, winnerId) {
    const db = getDatabase();
    const match = (db.tournament_matches || []).find((m) => sameId(m.match_id || m.id, matchId));
    if (match) {
      advanceMatchLocally(match.tournamentId, matchId, winnerId, db);
    }
    return true;
  },

  sanitizeTournamentMatches(tournamentId, dbInstance = null) {
    return sanitizeTournamentMatches(tournamentId, dbInstance);
  },

  generateBracketLocally(tournamentId, dbInstance = null) {
    return generateBracketLocally(tournamentId, dbInstance);
  },

  advanceMatchLocally(tournamentId, matchId, winnerId, dbInstance = null) {
    return advanceMatchLocally(tournamentId, matchId, winnerId, dbInstance);
  },

  advanceTournamentRound(tournamentId, dbInstance = null) {
    return advanceTournamentRound(tournamentId, dbInstance);
  }
};

export default tournamentService;
