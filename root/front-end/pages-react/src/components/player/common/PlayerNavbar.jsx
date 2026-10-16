/*
 * Concepts used: functional component, props, Context (Auth + Chat), useState,
 * useEffect with cleanup (window events, Escape key), useMemo, lists with keys,
 * conditional rendering, react-router Link/useNavigate.
 */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../../context/AuthContext';
import NotificationDropdown from '../notifications/NotificationDropdown';
import ConfirmModal from '../../common/ConfirmModal';
import FindPlayersModal from './FindPlayersModal';
import { useChat } from '../../../context/ChatContext';
import socialService from '../../../services/socialService';
import '../../../styles/player/drawer.css';

// Every player page, in the order a player thinks of them. The top bar only has
// room for the main six; the drawer lists them all.
const PLAYER_LINKS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/player/dashboard', inTopBar: true },
  { id: 'games', label: 'Games', icon: '🎮', path: '/player/games', inTopBar: true },
  { id: 'tournaments', label: 'Tournaments', icon: '🏆', path: '/player/tournaments', inTopBar: true },
  { id: 'my-tournaments', label: 'My Events', icon: '🎯', path: '/player/my-tournaments' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '👑', path: '/player/leaderboard' },
  { id: 'match-history', label: 'Match History', icon: '📊', path: '/player/match-history' },
  { id: 'community', label: 'Community', icon: '🛡️', path: '/player/community', inTopBar: true },
  { id: 'shop', label: 'Shop', icon: '🛍️', path: '/player/shop', inTopBar: true },
  { id: 'notifications', label: 'Notifications', icon: '🔔', path: '/player/notifications' },
  { id: 'profile', label: 'Profile', icon: '👤', path: '/player/profile', inTopBar: true }
];

const GUEST_LINKS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/player/dashboard', inTopBar: true },
  { id: 'games', label: 'Games', icon: '🎮', path: '/player/games', inTopBar: true },
  { id: 'register', label: 'Create Account Now', icon: '✨', path: '/index.html?action=register', external: true, inTopBar: true }
];

function initials(name) {
  return String(name || '?').slice(0, 2).toUpperCase();
}

export function PlayerNavbar(props) {
  const { activePage = 'dashboard' } = props;
  const { user, logout } = useContext(AuthContext);
  const {
    openChat,
    openProfile,
    friends,
    incomingRequests,
    unreadTotal,
    socialStatus,
    respondToRequest,
    refreshSocial
  } = useChat();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [filter, setFilter] = useState('');
  const [isFindPlayersModalOpen, setIsFindPlayersModalOpen] = useState(false);
  const [busyRequest, setBusyRequest] = useState(null);
  const [notice, setNotice] = useState('');

  const role = user?.role === 'guest' ? 'guest' : 'player';
  const roleBadge = role === 'guest' ? 'GUEST' : 'PLAYER';
  // No fallback id: chat and friends act as whoever is actually signed in.
  const currentUid = user?.userId ?? user?.id ?? user?.user_id ?? null;
  const links = role === 'guest' ? GUEST_LINKS : PLAYER_LINKS;
  const username = user?.username || (role === 'guest' ? 'Guest Player' : 'Player');
  const avatarText = user?.avatar || initials(username);

  // Open from outside (the Quick Access "Chat" button asks for this) and close on Escape.
  useEffect(() => {
    function open() {
      setDrawerOpen(true);
    }
    function onKey(e) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('open-friends-panel', open);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('open-friends-panel', open);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Friends: people who need an answer first, then who is playing, then the
  // most recent conversation, then A–Z.
  const shownFriends = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const rows = term ? friends.filter((f) => f.name.toLowerCase().includes(term)) : friends;
    return rows.slice().sort((a, b) => {
      if ((b.unread || 0) !== (a.unread || 0)) return (b.unread || 0) - (a.unread || 0);
      const pa = a.presence?.state === 'playing' ? 1 : 0;
      const pb = b.presence?.state === 'playing' ? 1 : 0;
      if (pb !== pa) return pb - pa;
      const ta = a.lastMessage ? Date.parse(a.lastMessage.sent_at) : 0;
      const tb = b.lastMessage ? Date.parse(b.lastMessage.sent_at) : 0;
      if (tb !== ta) return tb - ta;
      return a.name.localeCompare(b.name);
    });
  }, [friends, filter]);

  const badgeCount = unreadTotal + incomingRequests.length;

  function closeDrawer() {
    setDrawerOpen(false);
  }

  async function answerRequest(request, action) {
    setBusyRequest(request.id);
    setNotice('');
    try {
      await respondToRequest(request.id, action);
    } catch (err) {
      setNotice(err.message || 'Could not answer the request.');
    } finally {
      setBusyRequest(null);
    }
  }

  async function executeRemoveFriend() {
    if (!friendToRemove) return;
    const target = friendToRemove;
    setFriendToRemove(null);
    setNotice('');
    try {
      await socialService.removeFriend(currentUid, target.id);
      window.dispatchEvent(new CustomEvent('friends-updated'));
      await refreshSocial();
    } catch (err) {
      setNotice(err.message || 'Could not remove this friend.');
    }
  }

  function handleProfileClick(e) {
    if (typeof window !== 'undefined' && typeof window.showUserProfile === 'function') {
      window.showUserProfile(username, e);
    } else {
      navigate('/player/profile');
    }
  }

  function renderLink(link, extraClass = '') {
    const className = `nav-link ${activePage === link.id ? 'active' : ''} ${extraClass}`;
    const content = (
      <>
        <span>{link.icon}</span>
        <span>{link.label}</span>
      </>
    );
    if (link.external) {
      return (
        <a key={link.id} href={link.path} className={className} data-page={link.id}>
          {content}
        </a>
      );
    }
    return (
      <Link key={link.id} to={link.path} className={className} data-page={link.id}>
        {content}
      </Link>
    );
  }

  return (
    <>
      <div id="navbar" className="navbar" data-role={role}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            className="hamburger-btn pdr-burger"
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen((open) => !open);
            }}
            title="Menu, friends and chat"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            ☰
            {badgeCount > 0 && <span className="pdr-burger-badge">{badgeCount > 9 ? '9+' : badgeCount}</span>}
          </button>
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

        <nav className="nav-links">{links.filter((l) => l.inTopBar).map((l) => renderLink(l))}</nav>

        <div className="nav-user">
          <NotificationDropdown userId={currentUid} roleName={role} />
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
          <span className="nav-logout" onClick={logout} title="Logout" style={{ cursor: 'pointer' }}>
            ⬅️
          </span>
        </div>
      </div>

      {drawerOpen && (
        <div className="pdr-backdrop" onClick={closeDrawer}>
          <aside className="pdr-drawer" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <div className="pdr-head">
              <Link to="/player/dashboard" className="pdr-brand" onClick={closeDrawer}>
                <span>🎮</span>
                <span>PlayCarys</span>
              </Link>
              <button type="button" className="pdr-close" onClick={closeDrawer} aria-label="Close menu">
                ✕
              </button>
            </div>

            <div className="pdr-scroll">
              {/* Who is signed in */}
              <button
                type="button"
                className="pdr-me"
                onClick={() => {
                  closeDrawer();
                  navigate('/player/profile');
                }}
              >
                <span className="pdr-avatar">{avatarText}</span>
                <span className="pdr-me-text">
                  <span className="pdr-me-name">{username}</span>
                  <span className="pdr-me-role">{roleBadge} · view profile</span>
                </span>
              </button>

              {/* Every page */}
              <div className="pdr-label">Menu</div>
              <nav className="pdr-menu">
                {links.map((link) => {
                  const className = `pdr-item ${activePage === link.id ? 'active' : ''}`;
                  const inner = (
                    <>
                      <span className="pdr-item-icon">{link.icon}</span>
                      <span>{link.label}</span>
                    </>
                  );
                  return link.external ? (
                    <a key={link.id} href={link.path} className={className} onClick={closeDrawer}>
                      {inner}
                    </a>
                  ) : (
                    <Link key={link.id} to={link.path} className={className} onClick={closeDrawer}>
                      {inner}
                    </Link>
                  );
                })}
              </nav>

              {role !== 'guest' && (
                <section className="pdr-friends">
                  <div className="pdr-label pdr-label-row">
                    <span>
                      Friends <span className="pdr-count">{friends.length}</span>
                    </span>
                    {unreadTotal > 0 && <span className="pdr-unread-chip">{unreadTotal} unread</span>}
                  </div>

                  {socialStatus === 'signin' && (
                    <div className="pdr-note warn">
                      Sign in to see your friends and chat. (You are using a development session with no login.)
                    </div>
                  )}
                  {socialStatus === 'error' && (
                    <div className="pdr-note warn">Can’t reach the server. Friends will refresh when it’s back.</div>
                  )}
                  {notice && <div className="pdr-note bad">{notice}</div>}

                  {/* People waiting for an answer */}
                  {incomingRequests.length > 0 && (
                    <div className="pdr-requests">
                      <div className="pdr-sub-label">Friend requests</div>
                      {incomingRequests.map((r) => {
                        const name = r.other?.user_name || 'Player';
                        return (
                          <div className="pdr-row" key={r.id}>
                            <span className="pdr-avatar sm">{r.other?.avatar || initials(name)}</span>
                            <span className="pdr-row-text">
                              <span className="pdr-row-name">{name}</span>
                              <span className="pdr-row-sub">wants to be friends</span>
                            </span>
                            <button
                              type="button"
                              className="pdr-btn go"
                              disabled={busyRequest === r.id}
                              onClick={() => answerRequest(r, 'accept')}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="pdr-icon-btn"
                              title="Decline"
                              disabled={busyRequest === r.id}
                              onClick={() => answerRequest(r, 'reject')}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {friends.length > 4 && (
                    <input
                      type="text"
                      className="pdr-filter"
                      placeholder="Filter friends…"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  )}

                  <div className="pdr-list">
                    {shownFriends.map((f) => {
                      const playing = f.presence?.state === 'playing';
                      const preview = f.lastMessage
                        ? `${f.lastMessage.mine ? 'You: ' : ''}${f.lastMessage.body}`
                        : f.presence?.label || 'Offline';
                      return (
                        <div className="pdr-row" key={f.id}>
                          <button
                            type="button"
                            className="pdr-avatar-btn"
                            title="View profile"
                            onClick={() => {
                              openProfile(f);
                              closeDrawer();
                            }}
                          >
                            <span className="pdr-avatar sm">{f.avatar}</span>
                            <span className={`pdr-dot ${playing ? 'playing' : ''}`} />
                          </button>
                          <span className="pdr-row-text">
                            <span className="pdr-row-name">{f.name}</span>
                            <span className={`pdr-row-sub ${f.unread ? 'strong' : ''} ${playing && !f.lastMessage ? 'playing' : ''}`}>
                              {preview}
                            </span>
                          </span>
                          <button
                            type="button"
                            className="pdr-btn go"
                            onClick={() => {
                              openChat(f);
                              closeDrawer();
                            }}
                          >
                            Chat
                            {f.unread > 0 && <span className="pdr-pill">{f.unread}</span>}
                          </button>
                          <button
                            type="button"
                            className="pdr-icon-btn danger"
                            title={`Remove ${f.name}`}
                            onClick={() => setFriendToRemove(f)}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    {friends.length === 0 && socialStatus === 'ok' && (
                      <div className="pdr-empty">No friends yet. Find players to add some.</div>
                    )}
                    {friends.length > 0 && shownFriends.length === 0 && (
                      <div className="pdr-empty">No friend matches “{filter}”.</div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="pdr-find"
                    onClick={() => {
                      setIsFindPlayersModalOpen(true);
                      closeDrawer();
                    }}
                  >
                    🔍 Find players
                  </button>
                </section>
              )}
            </div>

            <div className="pdr-foot">
              <button type="button" className="pdr-logout" onClick={logout}>
                ⬅️ Log out
              </button>
            </div>
          </aside>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(friendToRemove)}
        title="Remove Friend"
        message={
          friendToRemove
            ? `Are you sure you want to remove ${friendToRemove.name} from your friends? This will end your friendship and clear the conversation for both of you.`
            : ''
        }
        confirmText="Remove Friend"
        cancelText="Cancel"
        onConfirm={executeRemoveFriend}
        onClose={() => setFriendToRemove(null)}
      />

      <FindPlayersModal
        isOpen={isFindPlayersModalOpen}
        onClose={() => setIsFindPlayersModalOpen(false)}
        currentUserId={currentUid}
        onMessage={(f) => {
          openChat(f);
          closeDrawer();
        }}
        onViewProfile={(p) => {
          openProfile(p);
          closeDrawer();
        }}
      />
    </>
  );
}

export default PlayerNavbar;
