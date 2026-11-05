import React, { useState, useEffect } from 'react';
import {
  isRegistered,
  myTeamsIn,
  entrantName,
  entrantCount,
  isCommunityMember,
  sanitizeTournamentMatches,
  tournamentService,
  hasPrizeMoney
} from '../../../services/tournamentService';
import { formatDate, sameId, GAME_ASSETS } from '../../../services/playerService';
import TournamentOrganizerPanel from './TournamentOrganizerPanel';
import TournamentTabs from './TournamentTabs';
import TournamentBracket from './TournamentBracket';
import TournamentLeaderboard from './TournamentLeaderboard';
import TournamentChat from './TournamentChat';

export function TournamentDetails({
  tournament,
  userId,
  db,
  onBack,
  onOpenRegModal,
  onRefresh,
  onShowToast,
  onWithdraw,
  withdrawingId
}) {
  const [activeTab, setActiveTab] = useState('tab-overview');

  const t = tournament;
  if (!t) return null;

  const tid = t.tournament_id || t.id;
  const uid = String(userId);

  // Automatically heal any falsely disputed or unplayed pending matches
  useEffect(() => {
    if (!t) return;
    sanitizeTournamentMatches(tid, db);
  }, [tid, db]);

  const reg = isRegistered(t, userId, db);
  const entrants = entrantCount(t, db);
  const max = t.maxParticipants || t.max_participants || 16;
  const isFull = entrants >= max;
  const regClosed = t.regClose ? new Date() > new Date(t.regClose) : false;

  // Score contest resolution
  const gameOf = (db.games || []).find((g) => sameId(g.game_id || g.id, t.game_id));
  const isScoreContest = t.format
    ? t.format === 'score'
    : gameOf && gameOf.game_mode
      ? gameOf.game_mode === 'single'
      : String(t.game_id) === '8';

  const publisherUser = (db.users || []).find((u) => sameId(u.user_id || u.id, t.publisherId || t.organizer));

  // Creator & Organizer resolution (never 'PlayCarys')
  const organizerId = t.organizer ?? t.organizer_id ?? t.publisherId ?? t.publisher_id ?? t.created_by ?? t.createdBy ?? t.user_id;
  const creatorUser = (db.users || []).find((u) => sameId(u.user_id || u.id, organizerId));
  const groupObj = t.group_id != null ? (db.groups || []).find((g) => sameId(g.group_id || g.id, t.group_id)) : null;
  const groupOwnerUser = groupObj ? (db.users || []).find((u) => sameId(u.user_id || u.id, groupObj.owner_id)) : null;
  const pubProf = (db.publisher_profiles || []).find((p) => sameId(p.user_id, organizerId));

  const isPlayCarys = (str) => !str || /^playcarys$/i.test(String(str).trim());

  let creatorDisplayName = null;
  if (creatorUser?.user_name && !isPlayCarys(creatorUser.user_name)) creatorDisplayName = creatorUser.user_name;
  else if (creatorUser?.username && !isPlayCarys(creatorUser.username)) creatorDisplayName = creatorUser.username;
  else if (creatorUser?.name && !isPlayCarys(creatorUser.name)) creatorDisplayName = creatorUser.name;
  else if (pubProf?.studio_name && !isPlayCarys(pubProf.studio_name)) creatorDisplayName = pubProf.studio_name;
  else if (pubProf?.company_name && !isPlayCarys(pubProf.company_name)) creatorDisplayName = pubProf.company_name;
  else if (t.organizer_name && !isPlayCarys(t.organizer_name)) creatorDisplayName = t.organizer_name.trim();
  else if (t.publisherName && !isPlayCarys(t.publisherName)) creatorDisplayName = t.publisherName.trim();
  else if (groupOwnerUser?.user_name && !isPlayCarys(groupOwnerUser.user_name)) creatorDisplayName = groupOwnerUser.user_name;
  else if (groupOwnerUser?.username && !isPlayCarys(groupOwnerUser.username)) creatorDisplayName = groupOwnerUser.username;
  else if (groupObj?.owner_name && !isPlayCarys(groupObj.owner_name)) creatorDisplayName = groupObj.owner_name.trim();
  else if (t.author && !isPlayCarys(t.author)) creatorDisplayName = t.author.trim();
  else if (creatorUser?.role === 'publisher') creatorDisplayName = `Publisher #${organizerId || '1'}`;
  else if (groupObj) creatorDisplayName = `${groupObj.name} Host`;
  else if (organizerId != null && String(organizerId) !== '') creatorDisplayName = `Player #${organizerId}`;
  else creatorDisplayName = 'Tournament Creator';

  const isCommunityTourn = t.group_id != null || t.kind === 'community' || (groupObj && sameId(groupObj.owner_id, organizerId));
  const isPublisherTourn = creatorUser?.role === 'publisher' || t.organizer_role === 'publisher' || t.kind === 'official' || t.publisherId != null;
  const isAdminTourn = creatorUser?.role === 'admin';
  const isCasualTourn = !isCommunityTourn && !isPublisherTourn && !isAdminTourn;

  let creatorRoleSubtitle = 'Verified Player ✓';
  let creatorRoleColor = 'var(--accent-green, #10b981)';
  let creatorGradient = 'linear-gradient(135deg, #059669, #10b981)';
  let creatorGlowColor = 'rgba(16, 185, 129, 0.25)';

  if (isCommunityTourn) {
    creatorRoleSubtitle = 'Community Owner ✓';
    creatorRoleColor = 'var(--accent-yellow, #f59e0b)';
    creatorGradient = 'linear-gradient(135deg, #d97706, #f59e0b)';
    creatorGlowColor = 'rgba(245, 158, 11, 0.25)';
  } else if (isPublisherTourn) {
    creatorRoleSubtitle = 'Verified Publisher ✓';
    creatorRoleColor = 'var(--accent-cyan, #06b6d4)';
    creatorGradient = 'linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-cyan, #06b6d4))';
    creatorGlowColor = 'rgba(6, 182, 212, 0.25)';
  } else if (isAdminTourn) {
    creatorRoleSubtitle = 'Platform Admin ✓';
    creatorRoleColor = '#a78bfa';
    creatorGradient = 'linear-gradient(135deg, #7c3aed, #a78bfa)';
    creatorGlowColor = 'rgba(167, 139, 250, 0.25)';
  }

  const creatorAvatar =
    creatorUser?.avatar ||
    groupOwnerUser?.avatar ||
    (creatorDisplayName ? creatorDisplayName.slice(0, 2).toUpperCase() : '👤');

  const helperGetGameEmoji = (g) => {
    if (!g) return '🎮';
    const imgKey = g.img || '';
    if (GAME_ASSETS?.EMOJI_MAP?.[imgKey]) return GAME_ASSETS.EMOJI_MAP[imgKey];
    if (g.icon) return g.icon;
    const cat = (g.category || g.game_type || '').toLowerCase();
    const gName = (g.game_name || g.name || g.title || '').toLowerCase();
    if (gName.includes('chess')) return '♟️';
    if (gName.includes('carrom')) return '🎲';
    if (gName.includes('deadshot')) return '🎯';
    if (gName.includes('hill')) return '🚙';
    if (gName.includes('hexgl')) return '🛸';
    if (gName.includes('2048')) return '🔢';
    if (gName.includes('hextris')) return '⬡';
    if (gName.includes('ancient')) return '🐉';
    if (cat.includes('rac')) return '🏎️';
    if (cat.includes('shoot') || cat.includes('fps') || cat.includes('action')) return '🎯';
    if (cat.includes('puzz') || cat.includes('logic')) return '🧩';
    if (cat.includes('sport')) return '🎱';
    if (cat.includes('strat') || cat.includes('board')) return '♟️';
    return '🎮';
  };

  const helperGetGameImage = (g) => {
    if (!g || !g.img) return null;
    const imgKey = g.img;
    if (imgKey.startsWith('http') || imgKey.startsWith('/') || imgKey.startsWith('data:image/')) return imgKey;
    if (GAME_ASSETS?.IMG_MAP?.[imgKey]) return GAME_ASSETS.IMG_MAP[imgKey];
    return null;
  };

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
      { order: 1, stage_order: 1, stageId: chessG.game_id || 7, game_id: chessG.game_id || 7, game_name: chessG.game_name || chessG.name || 'Chess Pro', name: chessG.game_name || chessG.name || 'Chess Pro', format: 'score' },
      { order: 2, stage_order: 2, stageId: hextrisG.game_id || 8, game_id: hextrisG.game_id || 8, game_name: hextrisG.game_name || hextrisG.name || 'Hextris', name: hextrisG.game_name || hextrisG.name || 'Hextris', format: 'score' }
    ];
  }

  const isMultiGame = t.type === 'multi' || isMultiTitle || rawStages.length > 1;

  const tournamentGamesList = isMultiGame
    ? rawStages.map((s, idx) => {
      const sGameId = s.game_id || s.gameId;
      const gObj = (db.games || []).find((g) => sameId(g.game_id || g.id, sGameId));
      const gName = gObj?.game_name || gObj?.name || gObj?.title || s.game_name || s.name || (t.game ? `${t.game} Stage ${idx + 1}` : `Stage ${idx + 1} Game`);
      const isSc = s.format === 'score' || (!s.format && isScoreContest);
      return {
        name: gName,
        subLabel: `Stage ${s.stage_order || idx + 1}${s.metric_label ? ` · ${s.metric_label}` : ''}`,
        emoji: helperGetGameEmoji(gObj),
        imgSrc: helperGetGameImage(gObj),
        formatBadge: isSc ? 'Score Attack' : 'Knockout',
        formatBadgeBg: isSc ? 'rgba(245, 158, 11, 0.12)' : 'rgba(6, 182, 212, 0.12)',
        formatBadgeColor: isSc ? 'var(--accent-yellow)' : 'var(--accent-cyan)',
        formatBadgeBorder: isSc ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.3)'
      };
    })
    : [
      {
        name: gameOf?.game_name || gameOf?.name || gameOf?.title || t.game || 'Tournament Arena Game',
        subLabel: gameOf?.category ? `${gameOf.category.toUpperCase()} · Mode: ${gameOf.game_mode || 'standard'}` : (t.format ? `Format: ${t.format}` : null),
        emoji: helperGetGameEmoji(gameOf),
        imgSrc: helperGetGameImage(gameOf),
        formatBadge: isScoreContest ? 'Score Attack' : 'Knockout 1v1',
        formatBadgeBg: isScoreContest ? 'rgba(245, 158, 11, 0.12)' : 'rgba(6, 182, 212, 0.12)',
        formatBadgeColor: isScoreContest ? 'var(--accent-yellow)' : 'var(--accent-cyan)',
        formatBadgeBorder: isScoreContest ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.3)'
      }
    ];

  const singleGameCategory = !isMultiGame && gameOf?.category ? gameOf.category : null;

  // My current ready match
  const mySlots = t.team_size
    ? myTeamsIn(t, userId, db).map((tm) => String(tm.team_id))
    : [uid];

  const myMatch = (db.tournament_matches || []).find(
    (m) =>
      sameId(m.tournamentId, t.id || t.tournament_id) &&
      (mySlots.includes(String(m.player1)) || mySlots.includes(String(m.player2))) &&
      (m.status === 'waiting' || (m.status === 'pending' && !m.reportedWinner && !m.reportedBy)) &&
      m.player1 &&
      m.player2 &&
      m.player1 !== 'BYE' &&
      m.player2 !== 'BYE'
  );

  // Matches pending verification or in dispute (must have an actual reported winner or reporter)
  const pendingMatch = (db.tournament_matches || []).find(
    (m) =>
      sameId(m.tournamentId, t.id || t.tournament_id) &&
      (sameId(m.player1, uid) || sameId(m.player2, uid)) &&
      m.status === 'pending' &&
      (m.reportedWinner != null || m.reportedBy != null)
  );

  const disputedMatch = (db.tournament_matches || []).find(
    (m) =>
      sameId(m.tournamentId, t.id || t.tournament_id) &&
      (sameId(m.player1, uid) || sameId(m.player2, uid) || sameId(organizerId, userId)) &&
      m.status === 'disputed'
  );

  // Community membership status
  const isCommunityMemberUser = t.group_id != null
    ? isCommunityMember(t.group_id, userId, db) || sameId(organizerId, userId)
    : true;

  // Launch handlers
  function handlePlayGame() {
    const gameId = String(t.game_id);
    if (typeof window !== 'undefined' && window.GameLaunch && window.GameLaunch.hasEngine(gameId)) {
      window.GameLaunch.launch(gameId, { mode: 'tournament', tournamentId: tid });
    } else {
      window.location.href = `/pages/player/games.html?highlight=${gameId}`;
    }
  }

  function handleEnterMatch(matchId) {
    tournamentService.enterMatch(t, matchId, userId).then((res) => {
      if (!res.success && res.reason) {
        onShowToast(res.reason, 'error');
      }
    });
  }

  function handleConfirmResult(mid) {
    tournamentService.confirmResult(mid);
    onShowToast('Result confirmed! The bracket has updated.', 'success');
    onRefresh();
  }

  const organizerRoleTitle = isCommunityTourn
    ? 'Community Organizer'
    : isPublisherTourn
      ? 'Tournament Publisher'
      : 'Tournament Organizer';

  function handleDisputeResult(mid) {
    tournamentService.disputeResult(mid);
    onShowToast(`Match disputed. ${organizerRoleTitle} (${creatorDisplayName}) has been notified to review and resolve the match.`, 'info');
    onRefresh();
  }

  function handleResetAndEnterMatch(mid) {
    tournamentService.resetDispute(mid);
    onShowToast('Dispute cleared! Entering arena...', 'success');
    onRefresh();
    handleEnterMatch(mid);
  }

  function handleResetDisputeOnly(mid) {
    tournamentService.resetDispute(mid);
    onShowToast('Dispute cleared — match is ready to be played.', 'success');
    onRefresh();
  }

  function handleResolveDisputeWinner(mid, winnerId) {
    tournamentService.resolveDisputeWinner(mid, winnerId);
    onShowToast('Dispute resolved! Winner advanced in bracket.', 'success');
    onRefresh();
  }

  // Helper for timeline
  const now = Date.now();
  const regCloseTs = t.regClose ? new Date(t.regClose).getTime() : 0;
  const isDone = t.status === 'completed';
  const isLive = t.status === 'in-progress';

  const timelineEvents = [
    { label: 'Registrations Open', date: 'Now', done: true, active: false },
    {
      label: 'Registration Deadline',
      date: formatDate(t.regClose),
      done: now > regCloseTs,
      active: now < regCloseTs && t.status === 'upcoming'
    },
    { label: 'Brackets Announced', date: '24h before start', done: isLive || isDone, active: false },
    { label: 'Tournament Begins', date: formatDate(t.startDate || t.start_date), done: isLive || isDone, active: isLive },
    { label: 'Grand Finals', date: 'Final round', done: isDone, active: false },
    {
      label: 'Results & Auto-Payouts',
      date: isDone ? 'Smart Contract Executed' : 'After Grand Finals',
      done: isDone,
      active: false
    }
  ];

  // Helper for prize breakdown
  const rawPrize =
    t.prize && t.prize !== '₹0' && t.prize !== '0'
      ? t.prize
      : t.prize_pool_paise
      ? `₹${(t.prize_pool_paise / 100).toLocaleString()}`
      : '₹2,500';
  const prizeStr = rawPrize;
  const totalPrize = parseInt(prizeStr.replace(/[^0-9]/g, ''), 10) || 2500;
  const isINR = prizeStr.includes('₹') || (!prizeStr.includes('$') && !prizeStr.toLowerCase().includes('pcp'));
  const sym = isINR ? '₹' : (prizeStr.toLowerCase().includes('pcp') ? 'PCP ' : '$');

  const prizeTiers = [
    { place: '1st', emoji: '🥇', pct: 60, color: 'var(--accent-yellow)', barColor: 'linear-gradient(90deg,#f59e0b,#fcd34d)' },
    { place: '2nd', emoji: '🥈', pct: 25, color: '#c0c0c0', barColor: 'linear-gradient(90deg,#9ca3af,#d1d5db)' },
    { place: '3rd', emoji: '🥉', pct: 10, color: '#cd7f32', barColor: 'linear-gradient(90deg,#b45309,#d97706)' },
    { place: '4th+', emoji: '🎖️', pct: 5, color: 'var(--text-secondary)', barColor: 'var(--border-primary)' }
  ];

  return (
    <div className="page-content" id="detail-view">
      <div
        className="back-btn"
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          cursor: 'pointer',
          color: 'var(--accent-cyan)',
          fontWeight: 600,
          marginBottom: '1.25rem'
        }}
      >
        ← All Tournaments
      </div>

      <div id="detail-content">
        {/* Detail Hero */}
        <div className="detail-hero">
          <div className="detail-hero-inner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span
                    className={`badge badge-${t.status === 'in-progress'
                        ? 'progress'
                        : t.status === 'completed'
                          ? 'approved'
                          : t.status === 'paused'
                            ? 'waiting'
                            : t.status === 'cancelled'
                              ? 'rejected'
                              : 'upcoming'
                      }`}
                  >
                    {t.status === 'in-progress'
                      ? 'In Progress'
                      : t.status === 'completed'
                        ? 'Completed'
                        : t.status === 'paused'
                          ? 'Paused'
                          : t.status === 'cancelled'
                            ? 'Cancelled'
                            : 'Upcoming'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    ID: {t.tournament_id || t.id}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    👥 {entrants} / {max} {t.team_size ? 'Teams' : 'Players'} Registered
                  </span>
                </div>
                <h1 className="hero-title">{t.tournament_name || t.name || t.desc}</h1>
                <p className="hero-desc">{t.desc}</p>
                {t.status === 'cancelled' && (
                  <div style={{ color: '#f87171', fontSize: '0.88rem', marginTop: '0.4rem', fontWeight: 600 }}>
                    🛑 Cancelled: {t.cancel_reason || 'This tournament was cancelled by the organizer.'}
                  </div>
                )}
                {t.status === 'completed' && t.winner && (
                  <div style={{ color: 'var(--accent-green)', fontSize: '0.92rem', marginTop: '0.4rem', fontWeight: 700 }}>
                    🏆 Champion: {t.winner}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                {hasPrizeMoney(t) && (
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Prize Pool
                    </div>
                    <div className="hero-prize">{t.prize}</div>
                  </div>
                )}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Registered: <strong style={{ color: 'var(--accent-cyan)' }}>{entrants}</strong> / {max} {t.team_size ? 'Teams' : 'Players'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Banners */}
        {myMatch && (
          <div className="match-action-bar">
            <div>
              <h3 style={{ marginBottom: '0.15rem', color: '#fff' }}>⚔️ Your Match is Ready!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Match ID: {myMatch.match_id} · Opponent:{' '}
                {entrantName(
                  t,
                  mySlots.includes(String(myMatch.player1)) ? myMatch.player2 : myMatch.player1,
                  db
                )}
              </p>
            </div>
            <button
              className="btn btn-purple btn-lg"
              onClick={() => handleEnterMatch(myMatch.match_id)}
              type="button"
            >
              ENTER ARENA
            </button>
          </div>
        )}

        {pendingMatch && (
          sameId(pendingMatch.reportedBy, uid) ? (
            <div
              className="match-action-bar"
              style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'var(--accent-yellow)', animation: 'none' }}
            >
              <div>
                <h3 style={{ color: 'var(--accent-yellow)', marginBottom: '0.2rem' }}>⏳ Result Reported</h3>
                <p className="text-sm" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Waiting for your opponent to confirm the 1-0 result...
                </p>
              </div>
              <button className="btn btn-ghost disabled" disabled type="button">
                Pending...
              </button>
            </div>
          ) : (
            <div
              className="match-action-bar"
              style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'var(--accent-green)', animation: 'none' }}
            >
              <div>
                <h3 style={{ color: 'var(--accent-green)', marginBottom: '0.2rem' }}>✅ Verify Result</h3>
                <p className="text-sm" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Your opponent reported a win. Do you agree with this result?
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-green"
                  onClick={() => handleConfirmResult(pendingMatch.match_id)}
                  type="button"
                >
                  Yes, I Agree
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ color: 'var(--accent-red)' }}
                  onClick={() => handleDisputeResult(pendingMatch.match_id)}
                  type="button"
                >
                  No, Dispute
                </button>
              </div>
            </div>
          )
        )}

        {disputedMatch && (
          <div
            className="match-action-bar"
            style={{
              background: 'rgba(239,68,68,0.1)',
              borderColor: 'var(--accent-red)',
              animation: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ color: 'var(--accent-red)', marginBottom: '0.2rem' }}>⚠️ Match in Dispute</h3>
                <p className="text-sm" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Match <strong>{disputedMatch.match_id}</strong> ({entrantName(t, disputedMatch.player1, db)} vs {entrantName(t, disputedMatch.player2, db)}) is under review by <strong>{organizerRoleTitle} ({creatorDisplayName})</strong>.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(239,68,68,0.2)',
                  color: 'var(--accent-red)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  fontWeight: 700
                }}
              >
                In Dispute
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {(sameId(disputedMatch.player1, uid) || sameId(disputedMatch.player2, uid)) && (
                <button
                  className="btn btn-purple"
                  onClick={() => handleResetAndEnterMatch(disputedMatch.match_id)}
                  type="button"
                >
                  ⚔️ Reset Dispute & Enter Arena
                </button>
              )}

              {sameId(organizerId, userId) && (
                <>
                  <button
                    className="btn btn-ghost"
                    style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                    onClick={() => handleResetDisputeOnly(disputedMatch.match_id)}
                    type="button"
                  >
                    🔄 Clear Dispute (Let Players Play)
                  </button>
                  <button
                    className="btn btn-green"
                    onClick={() => handleResolveDisputeWinner(disputedMatch.match_id, disputedMatch.player1)}
                    type="button"
                  >
                    Award Win to {entrantName(t, disputedMatch.player1, db)}
                  </button>
                  <button
                    className="btn btn-green"
                    onClick={() => handleResolveDisputeWinner(disputedMatch.match_id, disputedMatch.player2)}
                    type="button"
                  >
                    Award Win to {entrantName(t, disputedMatch.player2, db)}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {isScoreContest && reg && t.status === 'upcoming' && (
          <div
            className="match-action-bar"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-primary)', animation: 'none' }}
          >
            <div>
              <h3 style={{ marginBottom: '0.15rem', color: '#fff' }}>⏳ Not open yet</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                You're in. {t.game} opens for scoring on {formatDate(t.startDate || t.start_date)} — runs played before then don't count towards the leaderboard.
              </p>
            </div>
            <button className="btn btn-ghost btn-lg" disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} type="button">
              🔒 Locked
            </button>
          </div>
        )}

        {isScoreContest && reg && t.status === 'in-progress' && (
          <div
            className="match-action-bar"
            style={{
              background: 'linear-gradient(45deg,rgba(245,158,11,0.15),rgba(239,68,68,0.15))',
              borderColor: 'var(--accent-yellow)',
              animation: 'none'
            }}
          >
            <div>
              <h3 style={{ marginBottom: '0.15rem', color: '#fff' }}>🎯 {t.game} — Score Contest</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Play to set your best {t.metric_label || 'score'}. Your best run is what lands on the leaderboard.
              </p>
            </div>
            <button
              className="btn btn-lg"
              style={{
                background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                color: '#fff',
                fontWeight: 800,
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem'
              }}
              onClick={handlePlayGame}
              type="button"
            >
              🎮 Play Now
            </button>
          </div>
        )}

        {/* Organizer Panel */}
        <TournamentOrganizerPanel
          tournament={t}
          userId={userId}
          db={db}
          onStarted={onRefresh}
          onShowToast={onShowToast}
        />

        {/* Navigation Tabs */}
        <TournamentTabs activeTab={activeTab} onTabChange={setActiveTab} entrantCount={entrants} />

        {/* Tab 1: Overview */}
        {activeTab === 'tab-overview' && (
          <div className="tab-content">
            <div className="detail-grid">
              <div>
                <div className="info-section">
                  <h3>📆 Timeline</h3>
                  <div className="timeline">
                    {timelineEvents.map((e, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className={`timeline-dot ${e.done ? 'done' : e.active ? 'active' : ''}`} />
                        <div
                          className="timeline-title"
                          style={{
                            color: e.active ? 'var(--accent-cyan)' : e.done ? 'var(--text-primary)' : 'var(--text-secondary)'
                          }}
                        >
                          {e.label}
                        </div>
                        <div className="timeline-date">{e.date}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {hasPrizeMoney(t) && (
                  <div className="info-section">
                    <h3>🥇 Prize Distribution</h3>
                    <div>
                      {prizeTiers.map((tier, idx) => (
                        <div key={idx} className="prize-row">
                          <div
                            className="prize-rank-badge"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              color: tier.color,
                              border: `1px solid ${tier.color}`
                            }}
                          >
                            {tier.emoji}
                          </div>
                          <div style={{ minWidth: '42px', fontWeight: 700 }}>{tier.place}</div>
                          <div className="prize-bar">
                            <div className="prize-bar-fill" style={{ width: `${tier.pct}%`, background: tier.barColor }} />
                          </div>
                          <div style={{ minWidth: '40px', textAlign: 'right', fontWeight: 700, color: tier.color }}>
                            {tier.pct}%
                          </div>
                          <div style={{ minWidth: '72px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {sym}{Math.round((totalPrize * tier.pct) / 100).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="side-panel">
                <div className="action-panel">
                  {reg && t.status === 'upcoming' && onWithdraw ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <button
                        className="reg-cta registered"
                        type="button"
                        style={{ cursor: 'default' }}
                      >
                        ✓ Registered
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{
                          width: '100%',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                          color: 'var(--accent-red)',
                          opacity: withdrawingId && sameId(withdrawingId, tid) ? 0.6 : 1,
                          cursor: withdrawingId && sameId(withdrawingId, tid) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={Boolean(withdrawingId && sameId(withdrawingId, tid))}
                        onClick={() => onWithdraw(t)}
                        type="button"
                      >
                        {withdrawingId && sameId(withdrawingId, tid) ? 'Withdrawing...' : 'Withdraw from Tournament'}
                      </button>
                    </div>
                  ) : reg ? (
                    <button
                      className="reg-cta registered"
                      type="button"
                    >
                      ✓ Registered
                    </button>
                  ) : t.status === 'upcoming' && isFull ? (
                    <button
                      className="reg-cta registered"
                      disabled
                      style={{ opacity: 0.65, cursor: 'not-allowed' }}
                      type="button"
                    >
                      Field Full
                    </button>
                  ) : t.status === 'upcoming' ? (
                    !isCommunityMemberUser ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
                        <button
                          className="reg-cta registered"
                          disabled
                          style={{
                            opacity: 0.8,
                            cursor: 'not-allowed',
                            background: 'rgba(245, 158, 11, 0.12)',
                            borderColor: 'var(--accent-yellow)',
                            color: 'var(--accent-yellow)'
                          }}
                          type="button"
                        >
                          🔒 Community Members Only
                        </button>
                        <div style={{ fontSize: '0.78rem', color: 'var(--accent-yellow)', textAlign: 'center', lineHeight: 1.4 }}>
                          Exclusive to members of <strong>{groupObj?.name || 'this community'}</strong>. Join the community group to participate.
                        </div>
                      </div>
                    ) : (
                      <button
                        className="reg-cta open"
                        onClick={() => onOpenRegModal(t)}
                        type="button"
                      >
                        {t.team_size ? '⚡ Enter a Team' : '⚡ Register Now'}
                      </button>
                    )
                  ) : (
                    <button
                      className="reg-cta registered"
                      disabled
                      style={{ opacity: 0.65, cursor: 'not-allowed' }}
                      type="button"
                    >
                      {t.status === 'in-progress'
                        ? 'In Progress'
                        : t.status === 'completed'
                          ? 'Completed'
                          : 'Registration Closed'}
                    </button>
                  )}

                  {isScoreContest && reg && t.status === 'in-progress' && (
                    <button
                      className="reg-cta open"
                      style={{
                        marginTop: '0.75rem',
                        background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                        boxShadow: '0 4px 15px rgba(245,158,11,0.3)'
                      }}
                      onClick={handlePlayGame}
                      type="button"
                    >
                      🎮 Play {t.game}
                    </button>
                  )}
                </div>

                <div className="org-card">

                  {/* Games in Tournament (Before Created by) */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.6rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>🎮 {isMultiGame ? `Games in Tournament (${tournamentGamesList.length} Stages)` : 'Tournament Game'}</span>
                      {singleGameCategory && (
                        <span style={{ fontSize: '0.65rem', textTransform: 'capitalize', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          {singleGameCategory}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {tournamentGamesList.map((gItem, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.75rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: 'var(--radius-md, 8px)',
                            gap: '0.6rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.15rem',
                                flexShrink: 0,
                                overflow: 'hidden'
                              }}
                            >
                              {gItem.imgSrc ? (
                                <img
                                  src={gItem.imgSrc}
                                  alt={gItem.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                gItem.emoji
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  color: '#fff',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={gItem.name}
                              >
                                {gItem.name}
                              </div>
                              {gItem.subLabel && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                  {gItem.subLabel}
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '99px',
                              background: gItem.formatBadgeBg,
                              color: gItem.formatBadgeColor,
                              border: `1px solid ${gItem.formatBadgeBorder}`,
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            {gItem.formatBadge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section Divider */}
                  <div
                    style={{
                      height: '1px',
                      background: 'var(--border-primary, rgba(255, 255, 255, 0.08))',
                      margin: '0.9rem 0'
                    }}
                  />

                  {/* Created by */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.6rem'
                      }}
                    >
                      Created by :
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        className="avatar"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: creatorGradient,
                          border: `2px solid ${creatorRoleColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: typeof creatorAvatar === 'string' && creatorAvatar.length <= 2 ? '0.88rem' : '1.15rem',
                          fontWeight: 700,
                          color: '#fff',
                          flexShrink: 0,
                          boxShadow: `0 0 12px ${creatorGlowColor}`
                        }}
                      >
                        {creatorAvatar}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={creatorDisplayName}
                        >
                          {creatorDisplayName}
                        </div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: creatorRoleColor,
                            marginTop: '0.15rem'
                          }}
                        >
                          {creatorRoleSubtitle}
                        </div>
                        {groupObj?.name && (
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--text-secondary)',
                              marginTop: '0.15rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            🛡️ Community: <span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>{groupObj.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tournament Meta Tags in this section */}
                  <div
                    style={{
                      marginTop: '0.9rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.45rem'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: 'var(--text-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.07)'
                      }}
                    >
                      {isMultiGame ? `🎪 Multi-Game (${tournamentGamesList.length} Stages)` : isScoreContest ? '🎯 Score Contest' : '🏆 Knockout 1v1'}
                    </span>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: 'var(--text-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.07)'
                      }}
                    >
                      {t.team_size ? `👥 Squad (${t.team_size}v${t.team_size})` : '🧍 Solo (1v1)'}
                    </span>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: t.visibility === 'private' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: t.visibility === 'private' ? 'var(--accent-yellow)' : 'var(--accent-green)',
                        border: `1px solid ${t.visibility === 'private' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                      }}
                    >
                      {t.visibility === 'private' ? `🔒 Private${t.invite_code ? ` · ${t.invite_code}` : ''}` : '🌐 Public'}
                    </span>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: 'var(--text-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.07)'
                      }}
                    >
                      {t.group_id != null ? '🛡️ Community' : t.organizer_role === 'publisher' || t.kind === 'official' ? '🏢 Official' : '🎲 Casual'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bracket */}
        {activeTab === 'tab-bracket' && (
          <div className="tab-content">
            <div className="info-section">
              <h3>🎯 Dynamic Tournament Bracket</h3>
              <TournamentBracket tournament={t} db={db} />
            </div>
          </div>
        )}

        {/* Tab 3: Format & Rules */}
        {activeTab === 'tab-format' && (
          <div className="tab-content">
            <div className="info-section" style={{ marginBottom: '1.5rem' }}>
              <h3>🎮 Match Flow & Qualification</h3>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)' }}>
                <p style={{ marginBottom: '1rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#fff' }}>Match Flow:</strong>{' '}
                  {t.match_flow || 'Single Elimination tournament structure. Winners advance to the next round immediately.'}
                </p>
                <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#fff' }}>Qualification:</strong>{' '}
                  {t.qualification || 'Open registration for all authorized players. No minimum PCP required.'}
                </p>
              </div>
            </div>

            <div className="info-section">
              <h3>📜 Professional Rulebook</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(t.rules_list || [
                  'Participants must be present at match time.',
                  'Unfair play leads to disqualification.'
                ]).map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.7rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--accent-purple)'
                    }}
                  >
                    <span style={{ color: 'var(--accent-purple)', fontWeight: 800 }}>{i + 1}</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Leaderboard, Participants & Chat */}
        {activeTab === 'tab-leaderboard' && (
          <div className="tab-content">
            <div className="info-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0 }}>
                  {isScoreContest ? '🏁 Leaderboard & Participants' : '🏆 Official Leaderboard & Participants'}
                </h3>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    background: 'rgba(0, 212, 255, 0.12)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  👥 {entrants} / {max} {t.team_size ? 'Teams' : 'Players'} Registered
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {isScoreContest
                  ? `Everyone plays the same game; highest score wins. Currently ${entrants} of ${max} ${t.team_size ? 'teams' : 'players'} registered.`
                  : `Players are seeded by their global PlayCarys Points (PCP). Currently ${entrants} of ${max} ${t.team_size ? 'teams' : 'players'} registered.`}
              </p>
              <TournamentLeaderboard
                tournament={t}
                userId={userId}
                db={db}
                isScoreContest={isScoreContest}
              />
            </div>

            <TournamentChat
              tournamentId={tid}
              userId={userId}
              isRegistered={reg}
              onShowToast={onShowToast}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default TournamentDetails;
