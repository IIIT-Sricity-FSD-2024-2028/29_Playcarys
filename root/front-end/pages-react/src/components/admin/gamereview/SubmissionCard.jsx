/*
 * Concepts used in this component:
 *  - Components, Props (game, publisher)
 *
 * "Submission" card: the facts about the listing and who submitted it.
 */
import React from 'react';
import KvRow from './KvRow';

export function SubmissionCard(props) {
  const { game: g, publisher: pub } = props;

  return (
    <div className="card mb-2">
      <p className="sec-title">Submission</p>
      <div id="meta">
        <KvRow label="Game">{g.game_name}</KvRow>
        <KvRow label="Genre">{g.game_type}</KvRow>
        <KvRow label="Players">{g.players}</KvRow>
        <KvRow label="Publisher">
          {pub ? pub.user_name : 'Unknown'}
          {pub && pub.status !== 'active' ? <>{' '}<span className="badge badge-banned">{pub.status}</span></> : null}
        </KvRow>
        <KvRow label="Contact">{pub ? pub.email : '—'}</KvRow>
        <KvRow label="Submitted">{g.submittedDate || '—'}</KvRow>
        <div style={{ marginTop: '.75rem' }}>
          <p className="sec-title" style={{ marginBottom: '.3rem' }}>Description</p>
          <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{g.desc || '—'}</p>
        </div>
      </div>
    </div>
  );
}

export default SubmissionCard;
