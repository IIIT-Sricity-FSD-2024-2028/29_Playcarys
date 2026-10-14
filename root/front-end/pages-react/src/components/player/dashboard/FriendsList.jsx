import React from 'react';

export function FriendsList(props) {
  const { friends = [], isGuest = false, onSpectate } = props;

  if (isGuest) {
    return null;
  }

  function handleProfileClick(name, ev) {
    if (typeof window !== 'undefined' && typeof window.showUserProfile === 'function') {
      window.showUserProfile(name, ev);
    }
  }

  return (
    <div className="sidebar-section" id="friends-section">
      <div className="sid-title">Friends Online</div>
      <div id="friends-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
        {friends.length > 0 ? (
          friends.map((f) => {
            const presence = f.presence || {
              label: 'Online',
              color: '#10b981',
              canSpectate: false
            };

            return (
              <div
                key={f.id || f.name}
                className="friend-row"
                onClick={(e) => handleProfileClick(f.name, e)}
                title={`View ${f.name}'s profile`}
              >
                <div
                  className="friend-dot"
                  style={{ background: presence.color }}
                />
                <div className="friend-name">{f.name}</div>
                <div className="friend-status" style={{ color: presence.color }}>
                  {presence.label}
                </div>
                {presence.canSpectate && presence.session && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.68rem',
                      marginLeft: 'auto'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const sid =
                        presence.session.session_id != null
                          ? presence.session.session_id
                          : presence.session.id || presence.session.match_id;
                      if (onSpectate) onSpectate(sid);
                    }}
                  >
                    👁 Watch
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '0.75rem 0'
            }}
          >
            No friends yet — invite players!
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendsList;
