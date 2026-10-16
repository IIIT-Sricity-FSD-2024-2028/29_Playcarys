import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import socialService from '../../../services/socialService';
import ConfirmModal from '../../common/ConfirmModal';

export function FindPlayersModal({
  isOpen = false,
  onClose,
  currentUserId,
  onMessage,
  onViewProfile
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sentRequests, setSentRequests] = useState({});
  const [playerToRemove, setPlayerToRemove] = useState(null);
  const [notice, setNotice] = useState('');
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      setSentRequests({});
      setPlayerToRemove(null);
      setNotice('');
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const term = query.trim();

    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const rows = await socialService.searchPlayers(term, currentUserId);
        setResults(rows || []);
      } catch (err) {
        console.error('Search players error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timerRef.current);
  }, [query, isOpen, currentUserId]);

  if (!isOpen) return null;

  async function handleAddFriend(player, ev) {
    ev.stopPropagation();
    setNotice('');
    setSentRequests((prev) => ({ ...prev, [player.user_id]: true }));
    try {
      await socialService.sendFriendRequest(currentUserId, player.user_id);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('friends-updated'));
      }
    } catch (err) {
      // The server said no (already friends, cooldown after a rejection ...):
      // take the optimistic "Sent" back and say why.
      setSentRequests((prev) => ({ ...prev, [player.user_id]: false }));
      setNotice(err.message || 'Could not send the request.');
    }
  }

  async function handleConfirmRemove() {
    if (!playerToRemove) return;
    try {
      await socialService.removeFriend(currentUserId, playerToRemove.user_id);
      setResults((prev) =>
        prev.map((p) =>
          String(p.user_id) === String(playerToRemove.user_id)
            ? { ...p, relationship: 'none' }
            : p
        )
      );
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('friends-updated'));
      }
      setPlayerToRemove(null);
    } catch (err) {
      setPlayerToRemove(null);
      setNotice(err.message || 'Could not remove this friend.');
    }
  }

  function handleProfileClick(player) {
    if (onViewProfile) {
      onViewProfile(player);
    } else if (typeof window !== 'undefined' && typeof window.showUserProfile === 'function') {
      window.showUserProfile(player.user_name || player.username);
    }
  }

  const modalNode = (
    <div
      className="modal-overlay show"
      id="find-players-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        backgroundColor: 'rgba(4, 7, 15, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        opacity: 1,
        pointerEvents: 'all'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-card, #111520)',
          border: '1px solid var(--border-primary, #1e2336)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 30px rgba(0, 212, 255, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '82vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.1rem 1.4rem',
            borderBottom: '1px solid var(--border-primary, #1e2336)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 212, 255, 0.03)'
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#fff',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <span>🔍</span>
              <span>Find Players</span>
            </h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #8b9bb4)', marginTop: '0.2rem' }}>
              Search contenders across the platform to add as friends
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '1.1rem',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Search Input Box */}
        <div style={{ padding: '1rem 1.4rem 0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.9rem',
                color: 'var(--text-muted, #72809b)'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              autoFocus
              placeholder="Search by username — at least 2 letters"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '2.4rem',
                paddingRight: '1rem',
                height: '42px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                background: 'var(--bg-secondary, #161b2a)',
                borderColor: 'var(--border-primary, #26304a)'
              }}
            />
          </div>
        </div>

        {notice && (
          <div
            role="alert"
            style={{
              margin: '0.4rem 1.4rem 0',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#f87171',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)'
            }}
          >
            {notice}
          </div>
        )}

        {/* Results Container */}
        <div
          style={{
            overflowY: 'auto',
            padding: '0.75rem 1.4rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem',
            flex: 1
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted, #8b9bb4)', fontSize: '0.85rem' }}>
              Searching players…
            </div>
          ) : !hasSearched ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted, #8b9bb4)', fontSize: '0.82rem' }}>
              Type a username above to find opponents and allies.
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted, #8b9bb4)', fontSize: '0.82rem' }}>
              No players match “<b style={{ color: '#fff' }}>{query}</b>”.
            </div>
          ) : (
            results.map((p) => {
              const uName = p.user_name || p.username || 'Player';
              const pState = p.presence?.state || 'online';
              const isPlaying = pState === 'playing';
              const presenceLabel = isPlaying
                ? `Playing ${p.presence?.game || 'Match'}`
                : pState === 'online'
                ? 'Online'
                : 'Offline';
              const presenceColor = isPlaying
                ? 'var(--accent-cyan, #00d4ff)'
                : pState === 'online'
                ? 'var(--accent-green, #10b981)'
                : 'var(--text-muted, #72809b)';

              const rel = sentRequests[p.user_id] ? 'sent' : p.relationship;

              return (
                <div
                  key={p.user_id || p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: 'var(--bg-secondary, #161b2a)',
                    border: '1px solid var(--border-primary, #26304a)'
                  }}
                >
                  {/* Avatar */}
                  <div
                    onClick={() => handleProfileClick(p)}
                    title={`View ${uName}'s profile`}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      color: '#fff',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {p.avatar || uName.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => handleProfileClick(p)}
                      title={`View ${uName}'s profile`}
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {uName}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary, #8b9bb4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        marginTop: '0.1rem'
                      }}
                    >
                      <span style={{ color: presenceColor }}>● {presenceLabel}</span>
                      <span>·</span>
                      <span>{p.matches || 0} matches</span>
                      <span>·</span>
                      <span>{p.win_rate ?? 0}% win</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {rel === 'friends' ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '99px',
                            background: 'var(--accent-cyan, #00d4ff)',
                            color: '#000',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            if (onMessage) {
                              onMessage({ id: p.user_id, name: uName, avatar: p.avatar });
                            }
                            onClose();
                          }}
                        >
                          Message
                        </button>
                        <button
                          type="button"
                          title="Remove friend"
                          className="btn btn-ghost btn-sm"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.25rem 0.5rem',
                            color: '#f87171',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '99px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPlayerToRemove(p)}
                        >
                          Remove
                        </button>
                      </>
                    ) : rel === 'sent' ? (
                      <button
                        type="button"
                        disabled
                        className="btn btn-ghost btn-sm"
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '99px',
                          opacity: 0.6,
                          cursor: 'not-allowed'
                        }}
                      >
                        ✓ Request Sent
                      </button>
                    ) : rel === 'received' ? (
                      <button
                        type="button"
                        disabled
                        className="btn btn-ghost btn-sm"
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '99px',
                          opacity: 0.6,
                          cursor: 'not-allowed'
                        }}
                      >
                        Asked you already
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '99px',
                          background: 'var(--accent-purple, #7c3aed)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => handleAddFriend(p, e)}
                      >
                        + Add friend
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Community Hub Link */}
        <div
          style={{
            padding: '0.85rem 1.4rem',
            borderTop: '1px solid var(--border-primary, #1e2336)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #8b9bb4)' }}>
            Looking for tournaments & community rankings?
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: '0.75rem',
              color: 'var(--accent-cyan, #00d4ff)',
              cursor: 'pointer',
              fontWeight: 700
            }}
            onClick={() => {
              navigate('/player/community');
              onClose();
            }}
          >
            Explore Community Hub →
          </button>
        </div>
      </div>

      {/* Styled PlayCarys Modal Card for Removing Friend inside Find Modal */}
      <ConfirmModal
        isOpen={Boolean(playerToRemove)}
        title="Remove Friend"
        message={
          playerToRemove
            ? `Are you sure you want to remove ${playerToRemove.user_name || playerToRemove.username} from your friends? This will end your friendship and clear the conversation.`
            : ''
        }
        confirmText="Remove Friend"
        cancelText="Cancel"
        onConfirm={handleConfirmRemove}
        onClose={() => setPlayerToRemove(null)}
      />
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
}

export default FindPlayersModal;
