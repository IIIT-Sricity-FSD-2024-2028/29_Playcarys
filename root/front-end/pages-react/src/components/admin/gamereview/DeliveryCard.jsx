/*
 * Concepts used in this component:
 *  - Components, Props (game, scan, changedSinceApproved), Lists (origin tags)
 *
 * "Delivery" card: how the game reaches players (PlayCarys-hosted build or the publisher's own
 * server), the build hash, and any third-party origins the build reaches out to.
 */
import React from 'react';
import KvRow from './KvRow';
import { formatDate } from '../../../services/adminService';
import { kb } from '../../../services/adminReviewService';

export function DeliveryCard(props) {
  const { game: g, scan, changedSinceApproved } = props;

  const selfHosted = g.hosting_type === 'selfhosted';
  const origins = (scan && scan.external_origins) || [];

  return (
    <div className="card mb-2">
      <p className="sec-title">Delivery</p>
      <div id="delivery">
        <KvRow label="Model">{selfHosted ? '🔧 Self-hosted' : '🏠 PlayCarys hosted'}</KvRow>
        {selfHosted ? (
          <>
            <KvRow label="Game URL"><span className="mono">{g.game_url || '—'}</span></KvRow>
            <KvRow label="Webhook"><span className="mono">{g.webhook_url || '—'}</span></KvRow>
          </>
        ) : (
          <>
            <KvRow label="Path"><span className="mono">{g.play_path || 'not uploaded'}</span></KvRow>
            <KvRow label="Uploaded">{g.bundle_uploaded_at ? formatDate(g.bundle_uploaded_at.slice(0, 10)) : '—'}</KvRow>
            <KvRow label="Size">{kb(g.bundle_size)}</KvRow>
            <KvRow label="Build hash"><span className="mono">{String(g.bundle_hash || '—').slice(0, 24)}…</span></KvRow>
          </>
        )}
        {changedSinceApproved ? (
          <KvRow label="Previously approved">
            <span className="mono">{String(changedSinceApproved.previous_bundle_hash).slice(0, 24)}…</span>
            <br />
            <span style={{ color: 'var(--accent-yellow)', fontSize: '.76rem' }}>Different build — this one is unreviewed</span>
          </KvRow>
        ) : null}
      </div>
      <div id="origins-wrap" className={origins.length ? '' : 'hidden'} style={{ marginTop: '.75rem' }}>
        <p className="sec-title" style={{ marginBottom: '.35rem' }}>Third-party origins referenced</p>
        <div id="origins">
          {origins.map((o, i) => <span className="origin" key={i}>{o}</span>)}
        </div>
      </div>
    </div>
  );
}

export default DeliveryCard;
