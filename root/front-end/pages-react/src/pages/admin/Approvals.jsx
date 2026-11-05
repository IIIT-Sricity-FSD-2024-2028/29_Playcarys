/*
 * Concepts used in this component:
 *  - Components, Props (data and the onReview callback passed to child components),
 *    Lists (filtered game lists), Events (Review Build click), Hooks (useContext, useEffect, useState, useCallback),
 *    Context (AdminContext, so the page redraws when DB changes), Router (useAdminNav),
 *    Callbacks (handleReview), prop drilling (onReview → card → row)
 *
 * Mirrors pages/admin/approvals.html.
 */
import React, { useEffect, useContext, useState, useCallback } from 'react';
import api from '../../services/api';
import AdminContext from '../../context/AdminContext';
import { useAdminNav } from '../../components/admin/common/adminPages';
import ApprovalStats from '../../components/admin/approvals/ApprovalStats';
import PendingApprovalsCard from '../../components/admin/approvals/PendingApprovalsCard';
import ApprovedGamesGrid from '../../components/admin/approvals/ApprovedGamesGrid';
import { getDB } from '../../services/adminService';

export function Approvals() {
  useContext(AdminContext); // redraw when AdminContext.refresh() is called
  const go = useAdminNav();

  useEffect(() => {
    document.title = 'PlayCarys — Game Approvals';
  }, []);

  const [backendGames, setBackendGames] = useState(null);

  const fetchGames = useCallback(async () => {
    try {
      const res = await api.get('/games');
      if (Array.isArray(res)) {
        setBackendGames(res);
      }
    } catch (err) {
      console.warn('Failed to fetch /games for Approvals:', err);
    }
  }, []);

  useEffect(() => {
    fetchGames();

    // Auto-refresh when new games are published from another tab or window
    const handleStorage = () => fetchGames();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorage);

    // Periodic polling to keep approvals queue fresh
    const pollInterval = setInterval(fetchGames, 3500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorage);
      clearInterval(pollInterval);
    };
  }, [fetchGames]);

  // Read local DB, window.DB, and localStorage
  let localGames = [];
  try {
    const raw = localStorage.getItem('playcarys_db_store_v5');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.games)) localGames = parsed.games;
    }
  } catch (e) {
    // Ignore storage read errors
  }

  const gDb =
    typeof window !== 'undefined' && window.DB && Array.isArray(window.DB.games)
      ? window.DB.games
      : getDB()?.games || [];

  const dbGames = [...gDb, ...localGames];
  const mergedMap = new Map();

  dbGames.forEach((g) => {
    const gid = String(g.game_id || g.id);
    if (!gid || gid === 'undefined' || gid === 'null') return;
    mergedMap.set(gid, {
      ...g,
      id: g.id || g.game_id,
      game_id: g.game_id || g.id,
      title: g.title || g.game_name,
      game_name: g.game_name || g.title,
      genre: g.genre || g.game_type,
      game_type: g.game_type || g.genre,
      status: g.game_approval_status || g.status || 'pending',
      game_approval_status: g.game_approval_status || g.status || 'pending',
      publisher: g.publisher || g.game_publisher
    });
  });

  if (Array.isArray(backendGames)) {
    backendGames.forEach((bg) => {
      const gid = String(bg.game_id || bg.id);
      if (!gid || gid === 'undefined' || gid === 'null') return;
      const existing = mergedMap.get(gid) || {};
      mergedMap.set(gid, {
        ...existing,
        ...bg,
        id: bg.id || bg.game_id || existing.id,
        game_id: bg.game_id || bg.id || existing.game_id,
        title: bg.game_name || bg.title || existing.title,
        game_name: bg.game_name || bg.title || existing.game_name,
        genre: bg.game_type || bg.genre || existing.genre,
        game_type: bg.game_type || bg.genre || existing.game_type,
        status: bg.game_approval_status || bg.status || existing.status || 'pending',
        game_approval_status: bg.game_approval_status || bg.status || existing.game_approval_status || 'pending',
        publisher: bg.publisher || bg.game_publisher || existing.publisher
      });
    });
  }

  const allGames = Array.from(mergedMap.values());
  const pending = allGames.filter((g) => {
    const st = String(g.game_approval_status || g.status || '').trim().toLowerCase();
    return st === 'pending';
  });
  const approved = allGames.filter((g) => {
    const st = String(g.game_approval_status || g.status || '').trim().toLowerCase();
    return st === 'approved';
  });
  const games = allGames;

  // Approve / Reject live only in the review console, never on this list.
  function handleReview(gameId) {
    go('game-review', '?gameId=' + encodeURIComponent(gameId));
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Game Approvals</h1>
        <p className="text-muted">
          Every submission is decided in the build review console — open one to see what the
          scanner found and to try the game before it reaches players.
        </p>
      </div>

      <ApprovalStats total={games.length} pending={pending.length} approved={approved.length} />

      <PendingApprovalsCard games={pending} onReview={handleReview} />

      <ApprovedGamesGrid games={approved} />
    </div>
  );
}

export default Approvals;
