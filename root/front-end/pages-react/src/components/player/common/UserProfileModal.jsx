import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import socialService from '../../../services/socialService';
import ConfirmModal from '../../common/ConfirmModal';

export function UserProfileModal({
  isOpen = false,
  user = null,
  currentUserId,
  onClose,
  onMessage,
  onUnfriend
}) {
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  if (!isOpen || !user) return null;

  const isSelf = String(user.id || user.user_id) === String(currentUserId);
  const tierColor = user.tierInfo?.color || 'var(--accent-purple, #7c3aed)';
  const tierBg = user.tierInfo?.bg || 'linear-gradient(135deg, #7c3aed, #00d4ff)';
  const tierName = user.tierInfo?.name || 'IRON';

  function handleRemoveFriend() {
    setIsRemoveConfirmOpen(true);
  }

  async function executeRemoveFriend() {
    try {
      await socialService.removeFriend(currentUserId, user.id || user.user_id);
      setIsRemoveConfirmOpen(false);
      if (onUnfriend) onUnfriend(user);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('friends-updated'));
      }
      onClose();
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  }

  return createPortal(
    <div
      className="modal-overlay show"
      id="user-profile-modal-overlay"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        opacity: 1,
        pointerEvents: 'all',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: '440px',
          width: '100%',
          backgroundColor: '#0c1017',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 212, 255, 0.08)',
          padding: '2.2rem 2rem',
          position: 'relative',
          textAlign: 'left'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Circular Close Button */}
        <button
          type="button"
          onClick={onClose}
          title="Close"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: '#72809b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        {/* Top Section: Avatar */}
        <div style={{ position: 'relative', width: '74px', height: '74px', marginBottom: '1.2rem' }}>
          <div
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: tierBg,
              boxShadow: `0 0 0 3px ${tierColor}44, 0 0 16px ${tierColor}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#fff',
              fontFamily: 'monospace'
            }}
          >
            {user.avatar || (user.username || 'P').slice(0, 2).toUpperCase()}
          </div>
          {/* Status Dot */}
          <div
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              background: user.presence?.color || '#72809b',
              border: '2px solid #0c1017'
            }}
            title={user.presence?.label || 'Offline'}
          />
        </div>

        {/* Name */}
        <h2
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 0.35rem 0',
            letterSpacing: '0.5px',
            wordBreak: 'break-word'
          }}
        >
          {user.username}
        </h2>

        {/* Role & Tier Subtitle */}
        <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.5px' }}>
          <span style={{ color: 'var(--accent-cyan, #00d4ff)' }}>
            {(user.role || 'PLAYER').toUpperCase()}
          </span>{' '}
          <span style={{ color: '#72809b' }}>&bull;</span>{' '}
          <span style={{ color: tierColor }}>{tierName.toUpperCase()}</span>
        </div>

        {/* Presence status text */}
        <div
          style={{
            fontSize: '0.78rem',
            color: user.presence?.color || '#72809b',
            marginTop: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <span>●</span>
          <span>{user.presence?.label || 'Offline'}</span>
        </div>

        {/* Bio */}
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary, #93a0bd)',
            margin: '1.25rem 0 1.25rem 0',
            lineHeight: 1.5
          }}
        >
          {user.bio || 'A mysterious contender in the PlayCarys arena.'}
        </p>

        {/* Golden Points Box Matching Photo 2 */}
        <div
          style={{
            border: '1px solid rgba(234, 179, 8, 0.35)',
            background: 'rgba(234, 179, 8, 0.04)',
            borderRadius: '14px',
            padding: '1rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>💎</div>
          <div>
            <div
              style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#f59e0b'
              }}
            >
              {(user.pcp || 0).toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-muted, #72809b)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 700,
                marginTop: '0.15rem'
              }}
            >
              PLAYCARYS POINTS
            </div>
          </div>
        </div>

        {/* Thin Divider Line */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '1.25rem' }} />

        {/* 3-Column Stats Grid Matching Photo 2 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            textAlign: 'center',
            marginBottom: '1.75rem'
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#fff'
              }}
            >
              {user.matches ?? 0}
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted, #72809b)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontWeight: 700,
                marginTop: '0.25rem'
              }}
            >
              MATCHES
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#10b981'
              }}
            >
              {user.wins ?? 0}
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted, #72809b)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontWeight: 700,
                marginTop: '0.25rem'
              }}
            >
              WINS
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#f59e0b'
              }}
            >
              {user.winRate ?? 0}%
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted, #72809b)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontWeight: 700,
                marginTop: '0.25rem'
              }}
            >
              WIN RATE
            </div>
          </div>
        </div>

        {/* Action Buttons Row Matching Photo 2 */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {!isSelf ? (
            <>
              {/* Solid Cyan Pill Message Button */}
              <button
                type="button"
                style={{
                  flex: 1,
                  background: 'var(--accent-cyan, #00d4ff)',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  borderRadius: '99px',
                  padding: '0.75rem 1.4rem',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 212, 255, 0.35)'
                }}
                onClick={() => {
                  onClose();
                  if (onMessage) onMessage(user);
                }}
              >
                <span>💬</span>
                <span>Message</span>
              </button>

              {/* Red Outline Remove Button */}
              <button
                type="button"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#f87171',
                  borderRadius: '99px',
                  padding: '0.75rem 1.3rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
                onClick={handleRemoveFriend}
              >
                Remove
              </button>

              {/* Gift Button */}
              <button
                type="button"
                disabled
                title="Coming soon"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '0.75rem 0.95rem',
                  cursor: 'not-allowed',
                  opacity: 0.7,
                  fontSize: '1rem',
                  lineHeight: 1
                }}
              >
                🎁
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '99px'
              }}
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Styled PlayCarys Modal Card for Removing Friend */}
      <ConfirmModal
        isOpen={isRemoveConfirmOpen}
        title="Remove Friend"
        message={`Are you sure you want to remove ${user.username} from your friends? This will end your friendship and clear the conversation.`}
        confirmText="Remove Friend"
        cancelText="Cancel"
        onConfirm={executeRemoveFriend}
        onClose={() => setIsRemoveConfirmOpen(false)}
      />
    </div>,
    document.body
  );
}

export default UserProfileModal;
