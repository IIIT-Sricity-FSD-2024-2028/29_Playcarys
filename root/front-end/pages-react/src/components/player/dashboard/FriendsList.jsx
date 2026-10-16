import React, { useState, useContext } from 'react';
import { useChat } from '../../../context/ChatContext';
import AuthContext from '../../../context/AuthContext';
import socialService from '../../../services/socialService';
import ConfirmModal from '../../common/ConfirmModal';

export function FriendsList(props) {
  const { friends = [], isGuest = false, onSpectate } = props;
  const { openProfile, openChat, friends: serverFriends } = useChat();
  // Unread counts come from the server (this list itself still carries the
  // live-match info the Watch button needs).
  const unreadOf = (id) => (serverFriends.find((x) => String(x.id) === String(id)) || {}).unread || 0;
  const { user } = useContext(AuthContext);
  const [friendToRemove, setFriendToRemove] = useState(null);

  const currentUid = user?.userId ?? user?.id ?? user?.user_id ?? 7;

  if (isGuest) {
    return null;
  }

  function handleProfileClick(f, ev) {
    ev.preventDefault();
    openProfile(f);
  }

  async function executeRemoveFriend() {
    if (!friendToRemove) return;
    try {
      await socialService.removeFriend(currentUid, friendToRemove.id);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('friends-updated'));
      }
      setFriendToRemove(null);
    } catch (err) {
      console.error('Failed to unfriend:', err);
    }
  }

  return (
    <>
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
                  onClick={(e) => handleProfileClick(f, e)}
                  title={`View ${f.name}'s profile`}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <div
                    className="friend-dot"
                    style={{ background: presence.color }}
                  />
                  <div className="friend-name" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.name}
                  </div>
                  <div className="friend-status" style={{ color: presence.color, marginRight: '0.4rem' }}>
                    {presence.label}
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      style={{
                        padding: '0.18rem 0.65rem',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        borderRadius: '99px',
                        color: '#000',
                        background: 'var(--accent-cyan, #00d4ff)',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0, 212, 255, 0.3)'
                      }}
                      title={`Chat with ${f.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openChat(f);
                      }}
                    >
                      Chat{unreadOf(f.id) > 0 ? ` · ${unreadOf(f.id)} new` : ''}
                    </button>

                    <button
                      type="button"
                      title={`Remove ${f.name}`}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: 0,
                        lineHeight: 1
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFriendToRemove(f);
                      }}
                    >
                      ✕
                    </button>

                    {presence.canSpectate && presence.session && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{
                          padding: '0.12rem 0.45rem',
                          fontSize: '0.65rem',
                          borderRadius: '4px'
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
    </>
  );
}

export default FriendsList;
