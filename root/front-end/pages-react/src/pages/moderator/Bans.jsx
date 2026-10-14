import React, { useState } from 'react';

const PLAYERS = [
  { id: '1', username: 'ShadowX',    avatar: 'SX', level: 12, wins: 45, losses: 22, matches: 67, status: 'banned',  banReason: 'Repeated toxic behavior and harassment',  banDate: '2026-10-10', banExpires: '2026-10-17', banDuration: '7 Days' },
  { id: '2', username: 'DarkRaider', avatar: 'DR', level: 8,  wins: 30, losses: 18, matches: 48, status: 'banned',  banReason: 'Cheating — aimbot detected',              banDate: '2026-10-12', banExpires: 'Permanent',    banDuration: 'Permanent' },
  { id: '3', username: 'FrostByte',  avatar: 'FB', level: 20, wins: 88, losses: 31, matches: 119, status: 'active'  },
  { id: '4', username: 'VoidWalker', avatar: 'VW', level: 5,  wins: 12, losses: 20, matches: 32,  status: 'active'  },
  { id: '5', username: 'NightOwl',   avatar: 'NO', level: 15, wins: 61, losses: 29, matches: 90,  status: 'active'  },
  { id: '6', username: 'GhostByte',  avatar: 'GB', level: 3,  wins: 4,  losses: 10, matches: 14,  status: 'banned',  banReason: 'Griefing and match throwing',             banDate: '2026-10-13', banExpires: '2026-10-16', banDuration: '3 Days' },
  { id: '7', username: 'StarForge',  avatar: 'SF', level: 25, wins: 120, losses: 40, matches: 160, status: 'active' },
  { id: '8', username: 'IronClad',   avatar: 'IC', level: 18, wins: 75, losses: 35, matches: 110, status: 'active'  },
];

export default function ModeratorBans() {
  const [players, setPlayers]     = useState(PLAYERS);
  const [search,  setSearch]      = useState('');
  const [view,    setView]        = useState('main');   // 'main' | 'ban'
  const [banTarget, setBanTarget] = useState(null);
  const [banDuration, setBanDuration] = useState('7 Days');
  const [banReason, setBanReason]     = useState('');
  const [unbanConfirm, setUnbanConfirm] = useState(null);
  const [toast, setToast]         = useState(null);
  const [reasonError, setReasonError] = useState('');

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const q = search.toLowerCase().trim();
  const banned = players.filter(u => u.status === 'banned' && (!q || u.username.toLowerCase().includes(q)));
  const active = players.filter(u => u.status !== 'banned' && (!q || u.username.toLowerCase().includes(q)));

  function showBanView(userId) {
    const u = players.find(p => p.id === userId);
    setBanTarget(u);
    setBanDuration('7 Days');
    setBanReason('');
    setReasonError('');
    setView('ban');
  }

  function showMain() {
    setView('main');
    setBanTarget(null);
  }

  function issueBan() {
    if (!banReason || banReason.trim().length < 10) {
      setReasonError('Please provide a more detailed reason (min 10 characters)');
      return;
    }
    setPlayers(prev => prev.map(p => p.id === banTarget.id ? { ...p, status: 'banned', banReason: banReason.trim(), banDate: new Date().toISOString().slice(0, 10), banExpires: banDuration === 'Permanent' ? 'Permanent' : 'Expires soon', banDuration } : p));
    showToast('success', `${banTarget.username} has been banned for ${banDuration}`);
    showMain();
  }

  function unbanPlayer(userId) {
    setPlayers(prev => prev.map(p => p.id === userId ? { ...p, status: 'active', banReason: undefined } : p));
    showToast('success', `${unbanConfirm.username} has been unbanned`);
    setUnbanConfirm(null);
  }

  const total  = players.filter(p => p.id).length;
  const nBanned = players.filter(p => p.status === 'banned').length;
  const nActive = players.filter(p => p.status !== 'banned').length;

  return (
    <>
      {/* MAIN VIEW */}
      <div className="page-content" style={{ display: view === 'main' ? 'block' : 'none' }}>
        <div className="page-header">
          <h1>Ban Management</h1>
          <p className="text-muted">Manage player bans and restrictions</p>
        </div>

        <div className="stats-grid stats-grid-3 mb-3">
          <div className="stat-card"><div className="label">Total Players</div><div className="value">{total}</div><div className="icon">👥</div></div>
          <div className="stat-card"><div className="label">Banned</div><div className="value text-red">{nBanned}</div><div className="icon">🚫</div></div>
          <div className="stat-card"><div className="label">Active</div><div className="value text-green">{nActive}</div><div className="icon">✅</div></div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>🔍</span>
          <input className="form-input" placeholder="Search player name…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem' }} />
        </div>

        {/* Banned Players */}
        <div id="banned-section">
          <h2 className="mb-2">Banned Players</h2>
          {banned.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No banned players</p>
            </div>
          ) : banned.map(u => (
            <div key={u.id} className="list-item">
              <div className="avatar">{u.avatar}</div>
              <div className="list-item-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="list-item-title">{u.username}</span>
                  <span className="badge badge-banned">banned</span>
                </div>
                <div className="list-item-sub">Lv.{u.level} · {u.wins}W / {u.losses}L</div>
                <div className="text-xs" style={{ color: 'var(--accent-red)', marginTop: '0.25rem' }}>📅 Banned {u.banDate} · Expires: {u.banExpires} · Reason: {u.banReason}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }} onClick={() => setUnbanConfirm(u)}>✅ Unban</button>
            </div>
          ))}
        </div>

        {/* Active Players */}
        <div className="mt-3">
          <h2 className="mb-2">Active Players</h2>
          <div className="cards-grid-2" id="active-list">
            {active.map(u => {
              const wr = u.matches > 0 ? Math.round((u.wins / u.matches) * 100) : 0;
              return (
                <div key={u.id} className="list-item">
                  <div className="avatar">{u.avatar}</div>
                  <div className="list-item-info">
                    <div className="list-item-title">{u.username}</div>
                    <div className="list-item-sub text-sm">Lv.{u.level} · {u.wins}W / {u.losses}L · {wr}% WR</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => showBanView(u.id)}>🚫 Ban</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BAN VIEW */}
      <div className="page-content" style={{ display: view === 'ban' ? 'block' : 'none' }}>
        <div className="back-btn" onClick={showMain}>← Back</div>
        <h1>Ban Player</h1>
        <p className="text-muted mb-2">Issue a temporary or permanent ban</p>
        {banTarget && (
          <>
            <div className="detail-card">
              <h3>Player Information</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '0.75rem' }}>
                <div className="avatar avatar-lg">{banTarget.avatar}</div>
                <div>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontSize: '1.1rem', fontWeight: 700 }}>{banTarget.username}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Level {banTarget.level}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{banTarget.wins}W / {banTarget.losses}L · games played</div>
                </div>
              </div>
            </div>

            <div className="detail-card">
              <h3>🚫 Ban Details <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'Inter' }}>Configure the ban settings</span></h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Ban Duration</label>
                  <select className="form-select" value={banDuration} onChange={e => setBanDuration(e.target.value)}>
                    <option>1 Day</option><option>3 Days</option><option>7 Days</option>
                    <option>14 Days</option><option>30 Days</option><option>Permanent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason <span className="required">*</span></label>
                  <textarea className="form-textarea" placeholder="Explain the reason for the ban..." value={banReason} onChange={e => { setBanReason(e.target.value); setReasonError(''); }} />
                  {reasonError && <span className="form-error show">{reasonError}</span>}
                  <span className="form-hint">This reason will be visible to the player and stored in the moderation log</span>
                </div>
                <div className="alert alert-danger">🚫 This action will prevent <strong>{banTarget.username}</strong> from accessing the platform for the selected duration</div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={showMain}>Cancel</button>
                  <button className="btn btn-red" style={{ flex: 1 }} onClick={issueBan}>🚫 Issue Ban</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* UNBAN CONFIRM */}
      {unbanConfirm && (
        <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) setUnbanConfirm(null); }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Unban Player</h3>
              <span className="modal-close" onClick={() => setUnbanConfirm(null)}>✕</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Remove ban from <strong style={{ color: 'var(--text-primary)' }}>{unbanConfirm.username}</strong>?</p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setUnbanConfirm(null)}>Cancel</button>
              <button className="btn btn-green" onClick={() => unbanPlayer(unbanConfirm.id)}>✅ Confirm Unban</button>
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
