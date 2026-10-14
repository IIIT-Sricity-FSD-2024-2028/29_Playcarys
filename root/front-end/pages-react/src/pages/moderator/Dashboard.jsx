import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Mock data (mirrors DB structure) ──────────────────────────────────
const MOCK = {
  moderator: { username: 'Moderator', userId: 1 },
  stats: {
    pendingReports: 4,
    reviewReports: 2,
    resolvedTotal: 27,
    activeSessions: 5,
    bannedPlayers: 3,
    todayReports: 2,
  },
  recentReports: [
    { id: 'R-001', reporterName: 'Alpha', reportedName: 'ShadowX',    type: 'Toxic Behavior',  status: 'pending',      time: '2 hours ago' },
    { id: 'R-002', reporterName: 'Bravo', reportedName: 'DarkRaider', type: 'Cheating',         status: 'under-review', time: '4 hours ago' },
    { id: 'R-003', reporterName: 'Delta', reportedName: 'FrostByte',  type: 'Griefing',         status: 'resolved',     time: 'Yesterday'   },
    { id: 'R-004', reporterName: 'Echo',  reportedName: 'VoidWalker', type: 'Toxic Behavior',  status: 'pending',      time: 'Yesterday'   },
    { id: 'R-005', reporterName: 'Foxt',  reportedName: 'GhostByte',  type: 'Direct Contact',  status: 'dismissed',    time: '2 days ago'  },
  ],
  activityLog: [
    { icon: '✅', text: 'Report #R-003 resolved',              time: 'Yesterday',   color: 'rgba(16,185,129,0.12)', tc: '#10b981' },
    { icon: '⚠️', text: 'New report: Toxic Behavior by Alpha', time: '2 hours ago', color: 'rgba(245,158,11,0.12)', tc: '#f59e0b' },
    { icon: '🚫', text: 'GhostByte banned for 7 Days',        time: '3 hours ago', color: 'rgba(239,68,68,0.12)',  tc: '#ef4444' },
    { icon: '📌', text: 'Session #45 monitored',              time: '5 hours ago', color: 'rgba(0,212,255,0.15)',  tc: '#00d4ff' },
  ],
  perfRows: [
    { label: 'Actions Taken',   val: 12, pct: 100,  color: '#00d4ff' },
    { label: 'Warnings Issued', val: 5,  pct: 62,   color: '#f59e0b' },
    { label: 'Bans Issued',     val: 3,  pct: 50,   color: '#ef4444' },
    { label: 'Team Share (%)',  val: '38%', pct: 38, color: '#7c3aed' },
  ],
  chartDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  incoming:  [2, 5, 3, 7, 4, 6, 4],
  resolved:  [1, 4, 2, 5, 3, 4, 3],
};

// Badge helper
function badgeClass(status) {
  const map = {
    pending:      'badge badge-pending',
    'under-review': 'badge badge-review',
    resolved:     'badge badge-resolved',
    dismissed:    'badge badge-review',
    active:       'badge badge-active',
    banned:       'badge badge-banned',
    'in-progress': 'badge badge-progress',
  };
  return map[status] || 'badge badge-pending';
}

const now = new Date();
const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Simple inline SVG bar chart (replaces Chart.js)
function MiniBarChart({ days, incoming, resolved }) {
  const maxVal = Math.max(...incoming, ...resolved, 1);
  const W = 480, H = 160, PAD = { l: 24, r: 8, t: 12, b: 28 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const barW  = plotW / days.length;
  const px = (i) => PAD.l + i * barW + barW * 0.12;
  const py = (v) => PAD.t + plotH - (v / maxVal) * plotH;

  // Grid lines
  const gridVals = [0, Math.ceil(maxVal / 2), maxVal];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
      {/* grid */}
      {gridVals.map((g, i) => (
        <React.Fragment key={i}>
          <line x1={PAD.l} y1={py(g)} x2={W - PAD.r} y2={py(g)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={PAD.l - 4} y={py(g) + 4} fill="#6b7a99" fontSize="9" textAnchor="end">{g}</text>
        </React.Fragment>
      ))}
      {/* bars */}
      {days.map((d, i) => {
        const bw = barW * 0.36;
        return (
          <React.Fragment key={d}>
            <rect x={px(i)}        y={py(incoming[i])} width={bw} height={py(0) - py(incoming[i])} fill="rgba(245,158,11,0.65)" rx="2" />
            <rect x={px(i) + bw + 2} y={py(resolved[i])} width={bw} height={py(0) - py(resolved[i])} fill="rgba(16,185,129,0.65)" rx="2" />
            <text x={px(i) + bw} y={H - 8} fill="#6b7a99" fontSize="9" textAnchor="middle">{d}</text>
          </React.Fragment>
        );
      })}
      {/* legend */}
      <rect x={PAD.l} y={H - 14} width={8} height={8} fill="rgba(245,158,11,0.8)" rx="1" />
      <text x={PAD.l + 10} y={H - 7} fill="#c8d0e7" fontSize="9">Incoming</text>
      <rect x={PAD.l + 65} y={H - 14} width={8} height={8} fill="rgba(16,185,129,0.8)" rx="1" />
      <text x={PAD.l + 75} y={H - 7} fill="#c8d0e7" fontSize="9">Resolved</text>
    </svg>
  );
}

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  const [priority, setPriority]       = useState('medium');
  const [subject, setSubject]         = useState('');
  const [message, setMessage]         = useState('');
  const [toast, setToast]             = useState(null);

  const { stats, recentReports, activityLog, perfRows } = MOCK;

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSendToAdmin() {
    if (!message.trim()) { showToast('error', 'Message is required'); return; }
    showToast('success', '📨 Message sent to Admin');
    setContactOpen(false);
    setSubject(''); setMessage(''); setPriority('medium');
  }

  const statsData = [
    { label: 'Pending Reports', value: stats.pendingReports, color: 'var(--accent-yellow)', icon: '⚠️', sub: `${stats.todayReports} filed today`, go: 'reports', urgent: stats.pendingReports > 0 },
    { label: 'Under Review',    value: stats.reviewReports,  color: 'var(--accent-purple)', icon: '🔍', sub: 'being handled now', go: 'reports' },
    { label: 'Resolved Total',  value: stats.resolvedTotal,  color: 'var(--accent-green)',  icon: '✅', sub: 'all time' },
    { label: 'Active Sessions', value: stats.activeSessions, color: 'var(--accent-cyan)',   icon: '🎮', sub: 'playing right now', go: 'sessions' },
    { label: 'Banned Players',  value: stats.bannedPlayers,  color: 'var(--accent-red)',    icon: '🚫', sub: 'bans in force', go: 'bans' },
  ];

  const PRIORITY_STYLES = {
    low:      { border: 'rgba(234,179,8,0.4)',  bg: 'rgba(234,179,8,0.1)',   color: '#fde047' },
    medium:   { border: 'rgba(245,158,11,0.5)', bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
    high:     { border: 'rgba(239,68,68,0.5)',  bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
    critical: { border: 'rgba(220,38,38,0.7)',  bg: 'rgba(220,38,38,0.2)',   color: '#ff4444' },
  };
  const pStyle = (p) => PRIORITY_STYLES[p] || PRIORITY_STYLES.medium;

  return (
    <div className="page-content">

      {/* ── MOD HERO ── */}
      <div className="mod-hero">
        <div className="mod-hero-shield">🛡️</div>
        <div className="mod-hero-body">
          <div className="mod-hero-name">🛡 {MOCK.moderator.username}</div>
          <div className="mod-hero-sub">PlayCarys Moderation Team · {dateStr}</div>
        </div>
        <div className="mod-hero-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setContactOpen(true)}>📨 Contact Admin</button>
          <button className="btn btn-ghost btn-sm"   onClick={() => navigate('/moderator/reports')}>⚠️ View Reports</button>
        </div>
      </div>

      {/* ── TOP STATS ── */}
      <div className="mod-stats-row">
        {statsData.map((d) => (
          <div
            key={d.label}
            className={`mod-stat${d.go ? ' stat-link' : ''}${d.urgent ? ' stat-urgent' : ''}`}
            onClick={d.go ? () => navigate(`/moderator/${d.go}`) : undefined}
            style={{ cursor: d.go ? 'pointer' : 'default' }}
          >
            <div className="mod-stat-label">{d.label}</div>
            <div className="mod-stat-value" style={{ color: d.color }}>{d.value}</div>
            <div className="mod-stat-sub stat-sub">{d.icon} {d.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ── */}
      <div className="mod-grid">

        {/* Left: Chart + Recent Reports */}
        <div>
          <div className="card mb-2 chart-card">
            <h3 className="mb-1" style={{ fontSize: '0.9rem' }}>📈 Report Activity (Last 7 Days)</h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>Incoming reports vs. resolved per day</p>
            <MiniBarChart days={MOCK.chartDays} incoming={MOCK.incoming} resolved={MOCK.resolved} />
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>⚠️ Recent Reports</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/moderator/reports')}>View All →</button>
            </div>
            {recentReports.map((r) => (
              <div key={r.id} className="list-item" style={{ padding: '0.65rem 0', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'transparent', borderRadius: 0, marginBottom: 0, transform: 'none', boxShadow: 'none' }}>
                <div className="avatar avatar-sm">{r.reporterName.slice(0, 2).toUpperCase()}</div>
                <div className="list-item-info">
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    {r.reportedName} reported for <span style={{ color: 'var(--accent-yellow)' }}>{r.type}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>By {r.reporterName} · {r.time}</div>
                </div>
                <span className={badgeClass(r.status)}>{r.status}</span>
                {(r.status === 'pending' || r.status === 'under-review') && (
                  <button className="btn btn-outline btn-sm" onClick={() => navigate('/moderator/reports')} style={{ marginLeft: '0.5rem', fontSize: '0.68rem' }}>Review</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Quick Actions */}
          <div className="card">
            <div className="sid-title">⚡ Quick Actions</div>
            <div className="qa-grid">
              {[
                { icon: '📋', title: 'Reports',  sub: `${stats.pendingReports} pending`, go: '/moderator/reports' },
                { icon: '🎮', title: 'Sessions', sub: `${stats.activeSessions} active`, go: '/moderator/sessions' },
                { icon: '🚫', title: 'Bans',     sub: `${stats.bannedPlayers} total`,   go: '/moderator/bans'    },
                { icon: '📨', title: 'Escalate', sub: 'Contact admin', go: null },
              ].map((q) => (
                <div key={q.title} className="qa-btn" onClick={q.go ? () => navigate(q.go) : () => setContactOpen(true)}>
                  <div className="qa-btn-icon">{q.icon}</div>
                  <div className="qa-btn-text">
                    <div className="title">{q.title}</div>
                    <div className="sub">{q.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance */}
          <div className="card">
            <div className="sid-title">🏆 Your Moderation Record</div>
            <div className="perf-stat-list">
              {perfRows.map((r) => (
                <div key={r.label} className="perf-row">
                  <span style={{ minWidth: '110px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.label}</span>
                  <div className="perf-bar-wrap">
                    <div className="perf-bar-fill" style={{ width: `${r.pct}%`, background: r.color }} />
                  </div>
                  <span style={{ fontFamily: "'Orbitron',monospace", fontSize: '0.78rem', fontWeight: 700, color: r.color, minWidth: '28px', textAlign: 'right' }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="card" style={{ flex: 1 }}>
            <div className="sid-title">🕐 Activity Log</div>
            <div className="timeline" style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {activityLog.map((l, i) => (
                <div key={i} className="tl-item">
                  <div className="tl-dot" style={{ background: l.color }}>{l.icon}</div>
                  <div className="tl-body">
                    <div className="tl-title">{l.text}</div>
                    <div className="tl-time">{l.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div id="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* ── CONTACT ADMIN MODAL ── */}
      {contactOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setContactOpen(false); }}
          style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: '#111520', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '1rem', padding: '2rem', maxWidth: '500px', width: '90%', position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,#f59e0b,#00d4ff)', borderRadius: '1rem 1rem 0 0' }} />
            <button onClick={() => setContactOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-secondary)', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📨</div>
              <div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 800, fontSize: '1rem' }}>Contact Administrator</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Escalate an issue or request support</div>
              </div>
            </div>

            {/* Priority */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.6rem', display: 'block' }}>Priority Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {['low', 'medium', 'high', 'critical'].map((p) => {
                  const s = pStyle(p);
                  const active = priority === p;
                  const icons = { low: '🟡', medium: '🟠', high: '🔴', critical: '🚨' };
                  const subs  = { low: 'General query', medium: 'Needs attention', high: 'Urgent issue', critical: 'Platform at risk' };
                  return (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderRadius: '0.5rem', border: `1px solid ${active ? s.border : 'rgba(255,255,255,0.12)'}`, background: active ? s.bg : 'rgba(255,255,255,0.04)', color: active ? s.color : '#e5e7eb', fontSize: '0.82rem', fontWeight: active ? 800 : 600, cursor: 'pointer', textAlign: 'left', transform: active ? 'scale(1.03)' : 'none' }}>
                      <span style={{ fontSize: '1rem' }}>{icons[p]}</span>
                      <span>{p.charAt(0).toUpperCase() + p.slice(1)}<br /><span style={{ fontSize: '0.68rem', opacity: 0.7 }}>{subs[p]}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description of the issue…" className="form-input" />
            </div>

            {/* Message */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Message <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Describe the issue in detail…" className="form-textarea" style={{ resize: 'vertical' }} />
            </div>

            <div style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '0.5rem', padding: '0.7rem', marginBottom: '1.25rem', fontSize: '0.76rem', color: 'rgba(0,212,255,0.85)' }}>
              🔔 This message will be sent as a notification to an available administrator.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleSendToAdmin} style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#00d4ff)', color: '#000', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.5rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>📨 Send to Admin</button>
              <button onClick={() => setContactOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
