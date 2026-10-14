import React, { useState } from 'react';

const MATCHES = [
  { match_id: '101', game: 'Chess',         status: 'in-progress', mode: 'ranked',     duration: 1240, start_time: '2026-10-15T00:00:00Z', players: [{ name: 'Alpha',   avatar: 'AL' }, { name: 'Bravo', avatar: 'BR' }] },
  { match_id: '102', game: 'Hill Climbing', status: 'in-progress', mode: 'casual',     duration: 580,  start_time: '2026-10-14T23:50:00Z', players: [{ name: 'Delta',   avatar: 'DL' }, { name: 'Echo',  avatar: 'EC' }, { name: 'Foxt', avatar: 'FT' }] },
  { match_id: '103', game: '2048',          status: 'completed',   mode: 'casual',     duration: 320,  start_time: '2026-10-14T22:00:00Z', players: [{ name: 'Golf',    avatar: 'GL' }] },
  { match_id: '104', game: 'Hextris',       status: 'completed',   mode: 'tournament', duration: 900,  start_time: '2026-10-14T20:00:00Z', players: [{ name: 'Hotel',   avatar: 'HT' }, { name: 'India', avatar: 'IN' }] },
  { match_id: '105', game: 'Chess',         status: 'in-progress', mode: 'tournament', duration: 2100, start_time: '2026-10-14T23:30:00Z', players: [{ name: 'Juliet',  avatar: 'JU' }, { name: 'Kilo',  avatar: 'KI' }] },
  { match_id: '106', game: 'HexGL',         status: 'completed',   mode: 'ranked',     duration: 480,  start_time: '2026-10-14T19:00:00Z', players: [{ name: 'Lima',    avatar: 'LI' }, { name: 'Mike',  avatar: 'MK' }, { name: 'Nov', avatar: 'NV' }] },
];

const BADGE_MAP = {
  'in-progress': 'badge badge-active',
  completed:     'badge badge-resolved',
  pending:       'badge badge-pending',
};

// Simple SVG line chart for session trends
function SessionChart({ matches }) {
  const dayMap = {};
  matches.forEach(m => {
    const d = new Date(m.start_time);
    const key = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    dayMap[key] = (dayMap[key] || 0) + 1;
  });
  const entries = Object.entries(dayMap);
  const maxV = Math.max(...entries.map(e => e[1]), 1);
  const W = 500, H = 220, PAD = { l: 28, r: 12, t: 16, b: 32 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const n = entries.length;
  const px = (i) => PAD.l + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const py = (v) => PAD.t + plotH - (v / maxV) * plotH;

  const points = entries.map((e, i) => `${px(i)},${py(e[1])}`).join(' ');
  const fillPoints = `${PAD.l},${PAD.t + plotH} ${points} ${px(n - 1)},${PAD.t + plotH}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, Math.ceil(maxV / 2), maxV].map((g, i) => (
        <React.Fragment key={i}>
          <line x1={PAD.l} y1={py(g)} x2={W - PAD.r} y2={py(g)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={PAD.l - 4} y={py(g) + 4} fill="#6b7a99" fontSize="9" textAnchor="end">{g}</text>
        </React.Fragment>
      ))}
      {n > 0 && (
        <>
          <polygon points={fillPoints} fill="url(#sg)" />
          <polyline points={points} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" />
          {entries.map((e, i) => (
            <React.Fragment key={e[0]}>
              <circle cx={px(i)} cy={py(e[1])} r={4} fill="#a78bfa" />
              <text x={px(i)} y={H - 10} fill="#6b7a99" fontSize="9" textAnchor="middle">{e[0]}</text>
            </React.Fragment>
          ))}
        </>
      )}
    </svg>
  );
}

export default function ModeratorSessions() {
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter,   setModeFilter]   = useState('');
  const [matches,      setMatches]      = useState(MATCHES);
  const [monitored,    setMonitored]    = useState(null);
  const [toast,        setToast]        = useState(null);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = matches
    .filter(m => !statusFilter || m.status === statusFilter)
    .filter(m => !modeFilter   || m.mode   === modeFilter)
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  function terminateSession(id) {
    setMatches(prev => prev.map(m => m.match_id === id ? { ...m, status: 'completed' } : m));
    showToast('success', 'Match ended');
    setMonitored(null);
  }

  const allM       = matches;
  const inProgress = matches.filter(m => m.status === 'in-progress');
  const avgDur     = allM.length ? Math.round(allM.reduce((s, m) => s + (m.duration || 0), 0) / allM.length) : 0;
  const peakMatch  = allM.reduce((best, m) => (m.players.length > (best?.players.length || 0) ? m : best), null);

  return (
    <>
      <div className="page-content">
        <div className="page-header">
          <h1>Live Matches</h1>
          <p className="text-muted">Monitor matches being played, in real time</p>
        </div>

        {/* Stats */}
        <div className="stats-grid stats-grid-4 mb-3">
          <div className="stat-card"><div className="label">Being Played Now</div><div className="value text-cyan">{inProgress.length}</div><div className="icon">🎮</div></div>
          <div className="stat-card"><div className="label">All-Time Matches</div><div className="value text-purple">{allM.length}</div><div className="icon">📈</div></div>
          <div className="stat-card"><div className="label">Avg Duration (s)</div><div className="value text-green">{avgDur}</div><div className="icon">📅</div></div>
          <div className="stat-card"><div className="label">Peak Players</div><div className="value" style={{ fontSize: '1.2rem' }}>{peakMatch ? `${peakMatch.players.length} (${peakMatch.game})` : '—'}</div><div className="icon">🏔️</div></div>
        </div>

        {/* Chart */}
        <div className="card mb-3" style={{ height: '320px', position: 'relative' }}>
          <h3 className="mb-2">Platform Session Trends</h3>
          <SessionChart matches={allM} />
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '180px' }}>
            <option value="">All Matches</option>
            <option value="in-progress">Being Played</option>
            <option value="completed">Finished</option>
          </select>
          <select className="form-select" value={modeFilter} onChange={e => setModeFilter(e.target.value)} style={{ width: '180px' }}>
            <option value="">All Modes</option>
            <option value="casual">Casual</option>
            <option value="ranked">Ranked</option>
            <option value="tournament">Tournament</option>
          </select>
        </div>

        {/* Sessions list */}
        <div id="sessions-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🎮</div>
              <h3>No matches found</h3>
              <p>No matches match your filters</p>
            </div>
          ) : filtered.map(s => (
            <div key={s.match_id} className="list-item">
              <div className="list-item-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="list-item-title">{s.game}</span>
                  <span className={BADGE_MAP[s.status] || 'badge badge-pending'}>{s.status}</span>
                  <span className="badge badge-review" style={{ fontSize: '0.68rem' }}>{s.mode}</span>
                </div>
                <div className="list-item-sub mt-1">
                  <span>👥 {s.players.length} player{s.players.length !== 1 ? 's' : ''}</span>
                  <span>⏱ {s.duration}s</span>
                  <span>#{s.match_id}</span>
                </div>
                <div className="list-item-sub">
                  <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                    {s.players.map(p => (
                      <div key={p.name} className="avatar avatar-sm">{p.avatar}</div>
                    ))}
                  </div>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setMonitored(s)}>👁 Monitor</button>
            </div>
          ))}
        </div>
      </div>

      {/* MONITOR MODAL */}
      {monitored && (
        <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) setMonitored(null); }}>
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Monitoring: {monitored.game} #{monitored.match_id}</h3>
              <span className="modal-close" onClick={() => setMonitored(null)}>✕</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span className={BADGE_MAP[monitored.status] || 'badge badge-pending'}>{monitored.status}</span>
              <span className="tag">{monitored.mode}</span>
            </div>

            <div className="detail-grid mb-2">
              <div className="detail-field"><label>Game</label><span>{monitored.game}</span></div>
              <div className="detail-field"><label>Started</label><span>{new Date(monitored.start_time).toLocaleString()}</span></div>
              <div className="detail-field"><label>Players</label><span>{monitored.players.length}</span></div>
              <div className="detail-field"><label>Duration</label><span>{monitored.duration} seconds</span></div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>PLAYERS IN THIS MATCH</h4>
              {monitored.players.map(p => (
                <div key={p.name} className="list-item" style={{ padding: '0.6rem 0.9rem', marginBottom: '0.4rem' }}>
                  <div className="avatar avatar-sm">{p.avatar}</div>
                  <div style={{ flex: 1, fontSize: '0.875rem' }}>{p.name}</div>
                </div>
              ))}
            </div>

            <div className="alert alert-warning mt-2">⚠️ Terminating will disconnect all players immediately</div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setMonitored(null)}>Close</button>
              {monitored.status === 'in-progress' && (
                <button className="btn btn-red" onClick={() => terminateSession(monitored.match_id)}>⛔ Terminate Session</button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div id="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
