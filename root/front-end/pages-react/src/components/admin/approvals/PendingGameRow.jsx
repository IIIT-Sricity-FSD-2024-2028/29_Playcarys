/*
 * Concepts used in this component:
 *  - Components, Props (game, onReview), Events (button click), Callbacks (onReview gets the game id)
 *
 * One game waiting for approval. There is deliberately no Approve / Reject button here:
 * a decision is made in the build review console, after looking at the build.
 */
import React from 'react';
import GameIcon from '../common/GameIcon';
import StatusBadge from '../common/StatusBadge';
import { ScanChip, DeliveryChip } from './ApprovalChips';
import { formatDate } from '../../../services/adminService';

export function PendingGameRow(props) {
  const { game: g, onReview } = props;

  return (
    <div className="list-item">
      <GameIcon game={g} index={0} size="60px" />
      <div className="list-item-info">
        <div className="list-item-title">{g.title} <StatusBadge status="pending" /> <DeliveryChip game={g} /> <ScanChip game={g} /></div>
        <div className="list-item-sub">{g.desc}</div>
        <div className="list-item-sub">
          <span className="tag">{g.genre}</span>
          <span>👥 {g.players}</span>
          <span>By {g.publisher}</span>
          <span>📅 {formatDate(g.submittedDate)}</span>
        </div>
        {g.review_required_reason ? (
          <div className="list-item-sub" style={{ color: 'var(--accent-yellow)' }}>
            ↺ Back in the queue — {g.review_required_reason}
          </div>
        ) : null}
      </div>
      <div className="list-item-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onReview(g.id)}>🔍 Review Build</button>
      </div>
    </div>
  );
}

export default PendingGameRow;
