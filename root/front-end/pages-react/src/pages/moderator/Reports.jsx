import React, { useState } from 'react';

const REPORTS = [
  { id: 'R-001', reporterName: 'Alpha',   reportedName: 'ShadowX',    type: 'Toxic Behavior', status: 'pending',      time: '2 hours ago', session: 'S-101', desc: 'Used offensive language in chat repeatedly during the match.' },
  { id: 'R-002', reporterName: 'Bravo',   reportedName: 'DarkRaider', type: 'Cheating',        status: 'under-review', time: '4 hours ago', session: 'S-088', desc: 'Suspected aimbot usage, unnaturally high accuracy.' },
  { id: 'R-003', reporterName: 'Delta',   reportedName: 'FrostByte',  type: 'Griefing',        status: 'resolved',     time: 'Yesterday',   session: 'S-074', desc: 'Intentionally blocking teammates and throwing the match.' },
  { id: 'R-004', reporterName: 'Echo',    reportedName: 'VoidWalker', type: 'Toxic Behavior', status: 'pending',      time: 'Yesterday',   session: 'S-062', desc: 'Spamming slurs and hate speech in voice chat.' },
  { id: 'R-005', reporterName: 'Foxtrot', reportedName: '—',          type: 'Direct Contact',  status: 'dismissed',    time: '2 days ago',  session: 'S-055', desc: 'Player contacted support via in-game message.', isContact: true },
  { id: 'R-006', reporterName: 'Golf',    reportedName: 'NightOwl',   type: 'Cheating',        status: 'pending',      time: '3 days ago',  session: 'S-044', desc: 'Wall hacking, can see players through obstacles.' },
];

const BADGE_MAP = {
  pending:       'badge badge-pending',
  'under-review':'badge badge-review',
  resolved:      'badge badge-resolved',
  dismissed:     'badge badge-review',
};

const SEV_STYLES = {
  low:      { border: 'rgba(234,179,8,0.4)',  bg: 'rgba(234,179,8,0.1)',   color: '#fde047' },
  medium:   { border: 'rgba(245,158,11,0.5)', bg: 'rgba(245,158,11,0.1)', color: '#fbbf24' },
  high:     { border: 'rgba(239,68,68,0.5)',  bg: 'rgba(239,68,68,0.1)',  color: '#f87171' },
  critical: { border: 'rgba(220,38,38,0.7)',  bg: 'rgba(220,38,38,0.18)', color: '#ff4444' },
};

export default function ModeratorReports() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [search,       setSearch]       = useState('');
  const [view,         setView]         = useState('list'); // 'list' | 'action'
  const [activeReport, setActiveReport] = useState(null);
  const [severity,     setSeverity]     = useState('medium');
  const [notes,        setNotes]        = useState('');
  const [warnOpen,     setWarnOpen]     = useState(false);
  const [warnTarget,   setWarnTarget]   = useState('');
  const [warnMsg,      setWarnMsg]      = useState('');
  const [reports,      setReports]      = useState(REPORTS);
  const [toast,        setToast]        = useState(null);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = reports.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (typeFilter   && !r.type.toLowerCase().includes(typeFilter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.reporterName.toLowerCase().includes(q) &&
          !r.reportedName.toLowerCase().includes(q) &&
          !r.id.includes(q) &&
          !r.desc.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function reviewReport(id) {
    setReports(prev => prev.map(r => r.id === id && r.status === 'pending' ? { ...r, status: 'under-review' } : r));
    showToast('info', 'Report marked as Under Review');
  }

  function takeAction(id) {
    const r = reports.find(x => x.id === id);
    if (!r) return;
    setActiveReport({ ...r, status: r.status === 'pending' ? 'under-review' : r.status });
    setSeverity('medium');
    setNotes('');
    setView('action');
  }

  function resolveReport() {
    if (!notes || notes.length < 10) { showToast('error', 'Minimum 10 characters required'); return; }
    setReports(prev => prev.map(r => r.id === activeReport.id ? { ...r, status: 'resolved' } : r));
    showToast('success', 'Report resolved ✅');
    setView('list');
  }

  function dismissReport() {
    if (!notes || notes.length < 5) { showToast('error', 'Minimum 5 characters required'); return; }
    setReports(prev => prev.map(r => r.id === activeReport.id ? { ...r, status: 'dismissed' } : r));
    showToast('info', 'Report dismissed');
    setView('list');
  }

  function openWarn(r) {
    setWarnTarget(r.isContact ? r.reporterName : r.reportedName);
    setWarnMsg('');
    setWarnOpen(true);
  }

  function submitWarn() {
    showToast('success', `⚠️ Warning sent to ${warnTarget}`);
    setWarnOpen(false);
  }

  const sStyle = (s) => SEV_STYLES[s] || SEV_STYLES.medium;

  return (
    <>
      {/* ── LIST VIEW ── */}
      <div className="page-content" id="main-view" style={{ display: view === 'list' ? 'block' : 'none' }}>
        <div className="page-header">
          <h1>Player Reports</h1>
          <p className="text-muted">Review and handle reported player behavior</p>
        </div>

        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>🔍</span>
            <input className="form-input" placeholder="Search player name or report ID…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem' }} />
          </div>
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '160px' }}>
            <option value="">All Reports</option>
            <option value="pending">Pending</option>
            <option value="under-review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select className="form-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: '160px' }}>
            <option value="">All Types</option>
            <option value="Toxic Behavior">Toxic Behavior</option>
            <option value="Cheating">Cheating</option>
            <option value="Griefing">Griefing</option>
            <option value="Direct Contact">Direct Contact</option>
          </select>
        </div>

        <div id="reports-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">✅</div>
              <h3>No reports found</h3>
              <p>No reports match your current filters</p>
            </div>
          ) : filtered.map((r) => (
            <div key={r.id} className="list-item">
              <div className="list-item-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="list-item-title">Report #{r.id}</span>
                  <span className={BADGE_MAP[r.status] || 'badge badge-pending'}>{r.status}</span>
                  <span className="tag">{r.type}</span>
                  {r.isContact && <span style={{ fontSize: '0.7rem', background: 'rgba(0,212,255,0.12)', color: '#22d3ee', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '99px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>📡 Direct Contact</span>}
                </div>
                <div className="list-item-sub mt-1">
                  <div className="avatar avatar-sm">{r.reporterName.slice(0, 2).toUpperCase()}</div>
                  <strong>{r.reporterName}</strong>
                  <span>{r.isContact ? 'contacted moderator' : 'reported'}</span>
                  {!r.isContact && <><div className="avatar avatar-sm">{r.reportedName.slice(0, 2).toUpperCase()}</div><strong>{r.reportedName}</strong></>}
                  <span>· {r.time}</span>
                </div>
                <div className="text-sm text-muted mt-1">{r.desc}</div>
                <div className="text-xs text-muted mt-1">Session: {r.session}</div>
              </div>
              <div className="list-item-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                {r.status !== 'resolved' && r.status !== 'dismissed' && (
                  <button className="btn btn-yellow btn-sm" onClick={() => reviewReport(r.id)}>👁 Review</button>
                )}
                {(r.status === 'pending' || r.status === 'under-review') && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => takeAction(r.id)} style={{ borderColor: 'rgba(0,212,255,0.4)', color: 'var(--accent-cyan)' }}>⚡ Action</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openWarn(r)} style={{ borderColor: 'rgba(245,158,11,0.4)', color: 'var(--accent-yellow)', fontSize: '0.68rem' }}>⚠️ Warn</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTION VIEW ── */}
      <div className="page-content" id="action-view" style={{ display: view === 'action' ? 'block' : 'none' }}>
        <div className="back-btn" onClick={() => setView('list')}>← Back to Reports</div>
        <h1>Take Action on Report</h1>
        <p className="text-muted mb-2">Review and decide on this report</p>
        {activeReport && (
          <div id="action-content">
            <div className="detail-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontFamily: "'Orbitron',monospace", fontWeight: 700 }}>Report #{activeReport.id}</span>
                <span className={BADGE_MAP[activeReport.status] || 'badge badge-pending'}>{activeReport.status}</span>
                <span className="tag">{activeReport.type}</span>
                {activeReport.isContact && <span style={{ fontSize: '0.72rem', color: '#22d3ee', fontWeight: 700 }}>📡 Direct Contact</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Reported By</div>
                  <div style={{ fontWeight: 700 }}>{activeReport.reporterName}</div>
                </div>
                {!activeReport.isContact && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Reported Player</div>
                    <div style={{ fontWeight: 700 }}>{activeReport.reportedName}</div>
                  </div>
                )}
              </div>

              <div className="form-group mt-2">
                <label className="form-label">Report Description</label>
                <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>{activeReport.desc}</div>
              </div>
              <div className="form-group mt-2">
                <label className="form-label">Session · Time</label>
                <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                  {activeReport.session}<br /><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{activeReport.time}</span>
                </div>
              </div>
            </div>

            <div className="detail-card">
              <h3>⚡ Your Decision</h3>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Severity Level</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginTop: '0.5rem' }}>
                  {['low','medium','high','critical'].map((s) => {
                    const st = sStyle(s);
                    const active = severity === s;
                    const icons = { low:'🟡', medium:'🟠', high:'🔴', critical:'🚨' };
                    const subs  = { low:'First offence', medium:'Repeated', high:'Serious', critical:'Immediate' };
                    return (
                      <button key={s} type="button" onClick={() => setSeverity(s)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', borderRadius: '0.45rem', border: `1px solid ${active ? st.border : 'rgba(255,255,255,0.1)'}`, background: active ? st.bg : 'rgba(255,255,255,0.04)', color: active ? st.color : '#d1d5db', fontSize: '0.78rem', fontWeight: active ? 800 : 600, cursor: 'pointer', textAlign: 'left' }}>
                        <span>{icons[s]}</span><span>{s.charAt(0).toUpperCase()+s.slice(1)}<br /><span style={{ fontSize: '0.64rem', opacity: 0.7 }}>{subs[s]}</span></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Action Notes <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                <textarea className="form-textarea" placeholder="Write detailed notes about your decision…" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-green" style={{ flex: 1, minWidth: '120px' }} onClick={resolveReport}>✓ Resolve</button>
                <button className="btn btn-ghost" style={{ flex: 1, minWidth: '120px' }} onClick={dismissReport}>✕ Dismiss</button>
              </div>
              <button className="btn btn-ghost btn-sm w-full mt-2" style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'var(--accent-red)' }}>🚫 Escalate to Ban →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── WARN MODAL ── */}
      {warnOpen && (
        <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) setWarnOpen(false); }}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,#f59e0b,#ef4444)', borderRadius: '1rem 1rem 0 0' }} />
            <button className="modal-close" style={{ position: 'absolute', top: '1rem', right: '1rem' }} onClick={() => setWarnOpen(false)}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>⚠️</div>
              <div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 800, fontSize: '1rem' }}>Issue Warning</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>To: <strong style={{ color: 'var(--accent-yellow)' }}>{warnTarget}</strong></div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Custom message (optional — leave blank for default)</div>
            <textarea rows={4} placeholder="e.g. Please follow community guidelines." className="form-textarea" value={warnMsg} onChange={e => setWarnMsg(e.target.value)} />
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.5rem', padding: '0.75rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'rgba(245,158,11,0.9)' }}>
              ⚠️ The player will receive this warning as a notification.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={submitWarn} style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.5rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>⚠️ Send Warning</button>
              <button onClick={() => setWarnOpen(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.7rem 1.5rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Cancel</button>
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
