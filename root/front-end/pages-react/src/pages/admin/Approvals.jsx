/*
 * Concepts used in this component:
 *  - Components, Props (data and the onReview callback passed to child components),
 *    Lists (filtered game lists), Events (Review Build click), Hooks (useContext, useEffect, useState, useCallback),
 *    Context (AdminContext, so the page redraws when DB changes), Router (useAdminNav),
 *    Callbacks (handleReview), prop drilling (onReview → card → row)
 *
 * Mirrors pages/admin/approvals.html.
 */
import React, { useEffect, useContext } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchGames } from '../../features/games/gameSlice';
import { selectAllGames, selectGamesError, selectGamesStatus } from '../../features/games/selectors';
import AdminContext from '../../context/AdminContext';
import { useAdminNav } from '../../components/admin/common/adminPages';
import ApprovalStats from '../../components/admin/approvals/ApprovalStats';
import PendingApprovalsCard from '../../components/admin/approvals/PendingApprovalsCard';
import ApprovedGamesGrid from '../../components/admin/approvals/ApprovedGamesGrid';
import PublisherApplications from '../../components/admin/approvals/PublisherApplications';

export function Approvals() {
  useContext(AdminContext); // redraw when AdminContext.refresh() is called
  const go = useAdminNav();
  const dispatch = useAppDispatch();
  const allGames = useAppSelector(selectAllGames);
  const gamesStatus = useAppSelector(selectGamesStatus);
  const gamesError = useAppSelector(selectGamesError);

  useEffect(() => {
    document.title = 'PlayCarys — Game Approvals';
  }, []);

  useEffect(() => {
    const loadGames = () => dispatch(fetchGames());
    loadGames();

    // Keep the server-backed Redux catalogue current when returning to this portal.
    const handleStorage = () => loadGames();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorage);

    const pollInterval = setInterval(loadGames, 3500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorage);
      clearInterval(pollInterval);
    };
  }, [dispatch]);
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

      {gamesStatus === 'failed' && <p role="alert" className="text-danger">Failed to load games: {gamesError}</p>}

      <ApprovalStats total={games.length} pending={pending.length} approved={approved.length} />
      <PublisherApplications />

      <PendingApprovalsCard games={pending} onReview={handleReview} />

      <ApprovedGamesGrid games={approved} />
    </div>
  );
}

export default Approvals;
