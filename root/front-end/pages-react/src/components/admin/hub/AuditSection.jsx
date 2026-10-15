/*
 * Concepts used in this component:
 *  - Components, Props (active, auditLog, onClear), State (type filter), Events (clicks, choosing),
 *    Lists (audit entries), Hooks (useState), Forms (controlled filter dropdown), Callbacks (onClear)
 *
 * "Audit Log" section of the old hub.html: what admins did this session, filtered by kind of event.
 */
import React, { useState } from 'react';

const ICON_MAP = { user: '👤', game: '🎮', ban: '🚫', tournament: '🏆', system: '⚙️' };
const COLOR_MAP = {
  user: 'rgba(0,212,255,0.12)',
  game: 'rgba(16,185,129,0.12)',
  ban: 'rgba(239,68,68,0.12)',
  tournament: 'rgba(124,58,237,0.12)',
  system: 'rgba(245,158,11,0.12)'
};

export function AuditSection(props) {
  const { active, auditLog, onClear } = props;
  const [typeFilter, setTypeFilter] = useState('');

  let entries = [...auditLog];
  if (typeFilter) entries = entries.filter((e) => e.type === typeFilter);

  return (
    <div className={'hub-section' + (active ? ' active' : '')} id="sec-audit">
      <div className="flex items-center justify-between mb-2">
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Audit Log</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>🗑 Clear Log</button>
      </div>

      <div className="filter-bar mb-2">
        <select className="form-select" id="audit-type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: '180px' }}>
          <option value="">All Events</option>
          <option value="user">User Events</option>
          <option value="game">Game Events</option>
          <option value="ban">Ban Events</option>
          <option value="tournament">Tournament Events</option>
          <option value="system">System Events</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div id="audit-log-list">
          {entries.length ? entries.map((e, i) => (
            <div className="audit-entry" key={i}>
              <div className="audit-time">{e.time}</div>
              <div className="audit-icon" style={{ background: COLOR_MAP[e.type] || 'var(--bg-secondary)' }}>{ICON_MAP[e.type] || '📌'}</div>
              <div className="audit-body">
                <div className="audit-title">{e.msg}</div>
                <div className="audit-detail">{e.detail}</div>
              </div>
              <div className="audit-actor">{e.actor}</div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No audit entries found</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditSection;
