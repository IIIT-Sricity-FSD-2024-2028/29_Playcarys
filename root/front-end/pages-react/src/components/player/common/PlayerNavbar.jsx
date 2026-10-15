import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../../context/AuthContext';
import NotificationDropdown from '../notifications/NotificationDropdown';
import ConfirmModal from '../../common/ConfirmModal';
import FindPlayersModal from './FindPlayersModal';
import { useChat } from '../../../context/ChatContext';
import { getDatabase, sameId } from '../../../services/playerService';
import socialService from '../../../services/socialService';
import notificationService from '../../../services/notificationService';

export function PlayerNavbar(props) {
  const { activePage = 'dashboard' } = props;
  const { user, logout } = useContext(AuthContext);
  const { openChat, openProfile } = useChat();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [friendsVersion, setFriendsVersion] = useState(0);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [isFriendsSearchOpen, setIsFriendsSearchOpen] = useState(false);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [isFindPlayersModalOpen, setIsFindPlayersModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onFriendsUpdated() {
      setFriendsVersion((v) => v + 1);
    }
    window.addEventListener('friends-updated', onFriendsUpdated);
    return () => window.removeEventListener('friends-updated', onFriendsUpdated);
  }, []);

  const role = user?.role === 'guest' ? 'guest' : 'player';
  const roleBadge = role === 'guest' ? 'GUEST' : 'PLAYER';
  const currentUid = user?.userId ?? user?.id ?? user?.user_id ?? 7;

  const db = getDatabase();
  const friendRows = (db?.friendships || []).filter(
    (f) => (sameId(f.user_a, currentUid) || sameId(f.user_b, currentUid)) && !f.removed_at
  );
  const myFriends = friendRows.map((f) => {
    const friendId = sameId(f.user_a, currentUid) ? f.user_b : f.user_a;
    const fu = (db?.users || []).find((u) => sameId(u.id || u.user_id, friendId));
    const name = fu?.user_name || fu?.username || 'Friend';

    const liveMatch = (db?.matches || []).find(
      (m) =>
        m.status === 'in-progress' &&
        ((m.participants || []).some((p) => sameId(p, friendId)) || sameId(m.created_by, friendId))
    );
    const presence = liveMatch
      ? { label: `Playing ${liveMatch.game_name || 'Chess Pro'}`, color: '#00d4ff' }
      : { label: 'Offline', color: '#72809b' };

    return {
      id: friendId,
      name,
      avatar: fu?.avatar || name.slice(0, 2).toUpperCase(),
      presence
    };
  });

  const displayedFriends = friendsSearchQuery.trim()
    ? myFriends.filter((f) =>
        f.name.toLowerCase().includes(friendsSearchQuery.trim().toLowerCase())
      )
    : myFriends;

  async function executeRemoveFriend() {
    if (!friendToRemove) return;
    try {
      await socialService.removeFriend(currentUid, friendToRemove.id);
      setFriendsVersion((v) => v + 1);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('friends-updated'));
      }
      setFriendToRemove(null);
    } catch (err) {
      console.error('Failed to unfriend:', err);
    }
  }

  const playerLinks = role === 'guest'
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠', isReactRoute: true, path: '/player/dashboard' },
        { id: 'games', label: 'Games', icon: '🎮', isReactRoute: true, path: '/player/games' },
        { id: 'register', label: 'Create Account Now', icon: '✨', isReactRoute: false, path: '/index.html?action=register' }
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠', isReactRoute: true, path: '/player/dashboard' },
        { id: 'games', label: 'Games', icon: '🎮', isReactRoute: true, path: '/player/games' },
        { id: 'tournaments', label: 'Tournaments', icon: '🏆', isReactRoute: true, path: '/player/tournaments' },
        { id: 'community', label: 'Community', icon: '🛡️', isReactRoute: true, path: '/player/community' },
        { id: 'shop', label: 'Shop', icon: '🛍️', isReactRoute: true, path: '/player/shop' },
        { id: 'profile', label: 'Profile', icon: '👤', isReactRoute: true, path: '/player/profile' }
      ];

  const username = user?.username || (role === 'guest' ? 'Guest Player' : 'Player');
  const avatarText = user?.avatar || username.slice(0, 2).toUpperCase();

  function handleProfileClick(e) {
    if (typeof window !== 'undefined' && typeof window.showUserProfile === 'function') {
      window.showUserProfile(username, e);
    } else {
      navigate('/player/profile');
    }
  }

  return (
    <>
      <div id="navbar" className="navbar" data-role={role}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            className="hamburger-btn"
            style={{ position: 'relative', cursor: 'pointer', marginRight: '0.4rem' }}
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen(!drawerOpen);
            }}
            title="Menu"
          >
            ☰
          </span>
          <Link
            to="/player/dashboard"
            className="nav-brand"
            style={{ cursor: 'pointer', textDecoration: 'none' }}
            title="Go to Dashboard"
          >
            <span className="logo-icon">🎮</span>
            <span className="logo-text">PlayCarys</span>
            <span className="role-badge">{roleBadge}</span>
          </Link>
        </div>

        <nav className="nav-links">
          {playerLinks.map((link) => {
            const isActive = activePage === link.id;
            const className = `nav-link ${isActive ? 'active' : ''}`;

            if (link.isReactRoute) {
              return (
                <Link
                  key={link.id}
                  to={link.path}
                  className={className}
                  data-page={link.id}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            }

            return (
              <a
                key={link.id}
                href={link.path}
                className={className}
                data-page={link.id}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="nav-user">
          <NotificationDropdown userId={user?.userId ?? user?.id ?? 7} roleName={role} />
          <div style={{ textAlign: 'right' }}>
            <div className="nav-username">{username}</div>
            <div className="nav-role">{roleBadge}</div>
          </div>
          <div
            className="nav-avatar"
            id="pc-nav-avatar"
            title="View your profile"
            style={{ cursor: 'pointer' }}
            onClick={handleProfileClick}
          >
            {avatarText}
          </div>
          <span
            className="nav-logout"
            onClick={logout}
            title="Logout"
            style={{ cursor: 'pointer' }}
          >
            ⬅️
          </span>
        </div>
      </div>

      {/* Mobile drawer if toggled */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9998
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '260px',
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-primary)',
              padding: '1.5rem',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <Link
                to="/player/dashboard"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                onClick={() => setDrawerOpen(false)}
              >
                <span style={{ fontSize: '1.4rem' }}>🎮</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontWeight: 800, color: 'var(--accent-cyan)' }}>PlayCarys</span>
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Page navigation: displayed in drawer ONLY on reduced screens (< 768px). On desktop it is hidden so drawer remains a focused friends panel */}
            <div className="drawer-nav-mobile" style={{ flexDirection: 'column', gap: '0.4rem' }}>
              {playerLinks.map((link) => {
                const isActive = activePage === link.id;
                const className = `nav-link ${isActive ? 'active' : ''}`;

                if (link.isReactRoute) {
                  return (
                    <Link
                      key={link.id}
                      to={link.path}
                      className={className}
                      style={{ padding: '0.75rem 1rem' }}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                }

                return (
                  <a
                    key={link.id}
                    href={link.path}
                    className={className}
                    style={{ padding: '0.75rem 1rem' }}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </a>
                );
              })}
            </div>

            {/* Friends Section Matching Photo 1 */}
            {role !== 'guest' && (
              <div
                style={{
                  marginTop: '0.75rem',
                  borderTop: '1px solid var(--border-primary, rgba(255,255,255,0.08))',
                  paddingTop: '0.85rem'
                }}
              >
                {/* Header: 👥 FRIENDS [5] ... [🔍 Find] */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.05rem' }}>👥</span>
                    <span
                      style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: '#fff',
                        letterSpacing: '0.5px'
                      }}
                    >
                      FRIENDS
                    </span>
                    <span
                      style={{
                        background: '#0284c7',
                        color: '#fff',
                        borderRadius: '99px',
                        padding: '0.08rem 0.55rem',
                        fontSize: '0.68rem',
                        fontWeight: 800
                      }}
                    >
                      {myFriends.length}
                    </span>
                  </div>

                  {/* 🔍 Find Button: Toggles quick inline search to filter current friends */}
                  <button
                    type="button"
                    style={{
                      background: isFriendsSearchOpen ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                      border: isFriendsSearchOpen ? '1px solid rgba(0, 212, 255, 0.4)' : 'none',
                      color: isFriendsSearchOpen ? 'var(--accent-cyan, #00d4ff)' : '#93a0bd',
                      borderRadius: '99px',
                      padding: '0.2rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    onClick={() => {
                      setIsFriendsSearchOpen(!isFriendsSearchOpen);
                      if (isFriendsSearchOpen) setFriendsSearchQuery('');
                    }}
                    title={isFriendsSearchOpen ? 'Close search' : 'Filter your friends list'}
                  >
                    <span>🔍</span>
                    <span>{isFriendsSearchOpen ? 'Close' : 'Find'}</span>
                  </button>
                </div>

                {/* Inline Friends Filter Bar */}
                {isFriendsSearchOpen && (
                  <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Filter friends by name..."
                      value={friendsSearchQuery}
                      onChange={(e) => setFriendsSearchQuery(e.target.value)}
                      className="form-input"
                      style={{
                        width: '100%',
                        height: '30px',
                        fontSize: '0.78rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 212, 255, 0.3)'
                      }}
                    />
                    {friendsSearchQuery && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ height: '30px', padding: '0 0.45rem', fontSize: '0.75rem', color: '#93a0bd' }}
                        onClick={() => setFriendsSearchQuery('')}
                        title="Clear filter"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* Friend Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '210px', overflowY: 'auto' }}>
                  {displayedFriends.length > 0 ? (
                    displayedFriends.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem'
                        }}
                      >
                        {/* Circular Gradient Avatar */}
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            flexShrink: 0
                          }}
                        >
                          {f.avatar}
                        </div>

                        {/* Name + Status */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              openProfile(f);
                              setDrawerOpen(false);
                            }}
                            title="View profile"
                          >
                            {f.name}
                          </div>
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: f.presence?.label?.startsWith('Playing') ? '#00d4ff' : '#72809b',
                              marginTop: '0.1rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            ● {f.presence?.label || 'Offline'}
                          </div>
                        </div>

                        {/* Solid Cyan Pill Chat Button */}
                        <button
                          type="button"
                          style={{
                            background: 'var(--accent-cyan, #00d4ff)',
                            color: '#000',
                            fontWeight: 800,
                            borderRadius: '99px',
                            padding: '0.35rem 0.9rem',
                            border: 'none',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0, 212, 255, 0.35)'
                          }}
                          onClick={() => {
                            openChat(f);
                            setDrawerOpen(false);
                          }}
                        >
                          Chat
                        </button>

                        {/* Red Circular ✕ Unfriend Button */}
                        <button
                          type="button"
                          title={`Remove ${f.name}`}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#f87171',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: 0,
                            lineHeight: 1
                          }}
                          onClick={() => setFriendToRemove(f)}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #72809b)', padding: '0.5rem 0' }}>
                      No friends yet
                    </div>
                  )}
                </div>

                {/* Bottom Full-Width Cyan Pill "Find players" Button */}
                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: 'var(--accent-cyan, #00d4ff)',
                    color: '#000',
                    fontWeight: 800,
                    borderRadius: '99px',
                    padding: '0.65rem 1rem',
                    border: 'none',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginTop: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)'
                  }}
                  onClick={() => {
                    setIsFindPlayersModalOpen(true);
                    setDrawerOpen(false);
                  }}
                  title="Search and connect with players across PlayCarys"
                >
                  <span>🔍</span>
                  <span>Find players</span>
                </button>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{username}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{roleBadge}</div>
              </div>
              <span className="nav-logout" onClick={logout} title="Logout" style={{ cursor: 'pointer' }}>⬅️</span>
            </div>
          </div>
        </div>
      )}

      {/* Styled PlayCarys Modal Card for Removing Friend */}
      <ConfirmModal
        isOpen={Boolean(friendToRemove)}
        title="Remove Friend"
        message={
          friendToRemove
            ? `Are you sure you want to remove ${friendToRemove.name} from your friends? This will end your friendship and clear the conversation.`
            : ''
        }
        confirmText="Remove Friend"
        cancelText="Cancel"
        onConfirm={executeRemoveFriend}
        onClose={() => setFriendToRemove(null)}
      />

      {/* Dedicated Find Players Modal */}
      <FindPlayersModal
        isOpen={isFindPlayersModalOpen}
        onClose={() => setIsFindPlayersModalOpen(false)}
        currentUserId={currentUid}
        onMessage={(f) => {
          openChat(f);
          setDrawerOpen(false);
        }}
        onViewProfile={(p) => {
          openProfile(p);
          setDrawerOpen(false);
        }}
      />
    </>
  );
}

export default PlayerNavbar;
