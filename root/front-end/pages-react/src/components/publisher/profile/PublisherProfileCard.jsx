import React from 'react';

export function PublisherProfileCard({
  user,
  profile,
  totalGames = 0,
  approvedGames = 0,
  activeGames = 0,
  presence = { state: 'offline', label: 'Offline' },
  onEdit
}) {
  const username = profile?.studio_name || user?.user_name || user?.username || 'Publisher Studio';
  const avatar = user?.avatar || username.substring(0, 2).toUpperCase();
  const email = user?.email || 'No email provided';
  const phone = user?.phone_number || user?.phone || 'Not Set';

  return (
    <div className="profile-card">
      <div className="profile-header-wrap">
        {/* Avatar */}
        <div className="profile-avatar">
          {avatar}
        </div>

        {/* Profile Info */}
        <div className="profile-info">
          <div className="profile-title-row">
            <h2 className="profile-username">{username}</h2>
            <span className="badge badge-publisher">Publisher Studio</span>
            <span className={`badge ${presence.state === 'online' ? 'badge-active' : 'badge-disabled'}`}>
              {presence.state === 'online'
                ? '🟢 Online'
                : presence.state === 'playing'
                ? '🎮 Playing'
                : '⭕ Offline'}
            </span>
          </div>

          <div className="profile-meta-row">
            <span>📧</span> {email}
          </div>
          <div className="profile-meta-row">
            <span>📱</span> {phone}
          </div>

          {/* 3 KPI Summary items */}
          <div className="profile-kpi-row">
            <div className="profile-kpi-item">
              <div className="profile-kpi-val">{totalGames}</div>
              <div className="profile-kpi-label">Total Games</div>
            </div>

            <div className="profile-kpi-item">
              <div className="profile-kpi-val" style={{ color: 'var(--accent-green)' }}>
                {approvedGames}
              </div>
              <div className="profile-kpi-label">Approved Games</div>
            </div>

            <div className="profile-kpi-item">
              <div className="profile-kpi-val" style={{ color: 'var(--accent-cyan)' }}>
                {activeGames}
              </div>
              <div className="profile-kpi-label">Active Games</div>
            </div>
          </div>
        </div>

        {/* Edit Action */}
        <div style={{ alignSelf: 'flex-start', marginLeft: 'auto' }}>
          <button
            id="edit-profile-btn"
            type="button"
            className="btn btn-primary"
            onClick={onEdit}
          >
            ✏️ Edit Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublisherProfileCard;
