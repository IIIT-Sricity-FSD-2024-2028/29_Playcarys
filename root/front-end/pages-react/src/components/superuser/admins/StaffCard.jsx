import React from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return String(dateStr);
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function StaffCard({ user, isSelf, onOpenActions }) {
  const role = (user.role || (user.role_id === 2 ? 'admin' : 'moderator')).toLowerCase();
  const isSuspended = user.status === 'suspended';
  const cardClass = role === 'admin' ? 'admin-card-style' : 'moderator-card';
  const avatarText = user.avatar || (user.username || user.user_name || '??').slice(0, 2).toUpperCase();

  return (
    <div className={`admin-card ${cardClass}${isSuspended ? ' suspended' : ''}`}>
      <div className="avatar">
        {avatarText}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.9rem', fontWeight: 700 }}>
            {user.username || user.user_name}
          </span>
          <span className={`badge ${role === 'admin' ? 'badge-admin' : 'badge-moderator'}`}>
            {capitalize(role)}
          </span>
          {isSuspended ? (
            <span className="badge-suspended">⏸ Suspended</span>
          ) : (
            <span className="badge badge-active">🟢 Active</span>
          )}
          {isSelf && (
            <span
              className="tag"
              style={{
                background: 'rgba(0,212,255,0.12)',
                color: 'var(--accent-cyan)',
                borderColor: 'rgba(0,212,255,0.3)'
              }}
            >
              You
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            marginTop: '0.25rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <span>{user.email}</span>
          <span>Joined {formatDate(user.joinDate || user.created_at)}</span>
        </div>
      </div>

      {!isSelf && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onOpenActions(user)}
        >
          ⚙️ Actions
        </button>
      )}
    </div>
  );
}

export default StaffCard;
