/*
 * Concepts used in this component:
 *  - Components, Props (data and the onReview callback passed to child components),
 *    Lists (filtered game lists), Events (Review Build click), Hooks (useContext, useEffect),
 *    Context (AdminContext, so the page redraws when DB changes), Router (useAdminNav),
 *    Callbacks (handleReview), prop drilling (onReview → card → row)
 *
 * Mirrors pages/admin/approvals.html.
 */
import React, { useEffect, useContext } from 'react';
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

  const games = getDB().games;
  const pending = games.filter((g) => g.status === 'pending');
  const approved = games.filter((g) => g.status === 'approved');

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
