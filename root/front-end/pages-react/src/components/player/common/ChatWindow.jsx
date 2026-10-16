import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import socialService from '../../../services/socialService';
import ConfirmModal from '../../common/ConfirmModal';

export function ChatWindow({
  isOpen = false,
  friend = null,
  currentUserId,
  onClose,
  onRead
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const friendIdRef = useRef(null);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;

  const friendId = friend?.id || friend?.user_id;
  const friendName = friend?.name || friend?.username || 'Friend';
  const friendAvatar = friend?.avatar || friendName.slice(0, 2).toUpperCase();
  const presence = friend?.presence || { label: 'Offline', color: '#72809b' };
  friendIdRef.current = friendId;

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load the conversation, then poll it. Everything async here checks
  // `cancelled`, which flips when the chat switches to another friend or
  // closes: before that, a slow reply for the PREVIOUS friend could land after
  // the switch and put their messages in the new friend's window.
  useEffect(() => {
    if (!isOpen || !friendId || !currentUserId) return undefined;
    let cancelled = false;
    setMessages([]);
    setError('');

    async function load(silently) {
      if (!silently) setLoading(true);
      try {
        const rows = await socialService.getConversation(currentUserId, friendId);
        if (cancelled) return;
        setMessages(rows);
        setError('');
        // Acknowledge receipt only when there is something to acknowledge.
        const hasNew = rows.some(
          (m) => String(m.to_user) === String(currentUserId) && !m.delivered_at
        );
        if (hasNew) {
          socialService.markDelivered(currentUserId, friendId).then(() => {
            if (!cancelled && onReadRef.current) onReadRef.current();
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.status === 403
              ? 'Sign in again to use chat.'
              : 'Could not load this conversation. Retrying…'
          );
        }
      } finally {
        if (!cancelled && !silently) setLoading(false);
      }
    }

    load(false);
    const interval = setInterval(() => {
      if (!document.hidden) load(true);
    }, 3500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, friendId, currentUserId]);

  // Auto scroll on message update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Send message
  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !currentUserId || !friendId) return;

    const target = friendId;
    setSending(true);
    setText('');
    setError('');
    try {
      const newMsg = await socialService.sendMessage(currentUserId, target, trimmed);
      // Only show it if this window is still talking to the same person, and
      // never twice (the poll may have fetched it already).
      if (String(friendIdRef.current) === String(target)) {
        setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
        scrollToBottom();
      }
    } catch (err) {
      // Say what went wrong and give the text back — the message did NOT go.
      setError(err.message || 'Message not sent.');
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  function handleDeleteConversation() {
    setIsDeleteModalOpen(true);
  }

  async function confirmDeleteConversation() {
    try {
      await socialService.deleteConversation(currentUserId, friendId);
      setMessages([]);
      setIsDeleteModalOpen(false);
      if (onReadRef.current) onReadRef.current();
    } catch (err) {
      setIsDeleteModalOpen(false);
      setError(err.message || 'Could not clear the conversation.');
    }
  }

  const emotes = ['🔥', '🎮', '🏆', '👑', '👏', '⚡', '😎', '💀', '💯', '✨'];

  if (!isOpen || !friend) return null;

  return createPortal(
    <div
      id="pc-chat-window"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '350px',
        maxWidth: 'calc(100vw - 32px)',
        height: '460px',
        maxHeight: 'calc(100vh - 48px)',
        backgroundColor: 'var(--bg-modal, #0f131c)',
        border: '1px solid var(--border-primary, rgba(255,255,255,0.12))',
        borderRadius: '16px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 24px rgba(124,58,237,0.15)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* ── Chat Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-secondary, rgba(255,255,255,0.04))',
          borderBottom: '1px solid var(--border-primary, rgba(255,255,255,0.08))',
          userSelect: 'none'
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: '#fff',
              fontFamily: 'monospace'
            }}
          >
            {friendAvatar}
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: presence.color || '#10b981',
              border: '2px solid #0f131c'
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-primary, #e9edf7)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {friendName}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: presence.color || 'var(--text-secondary, #93a0bd)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            ● {presence.label || 'Online'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <button
            type="button"
            onClick={handleDeleteConversation}
            title="Clear conversation for you"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #93a0bd)',
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '6px',
              fontSize: '0.95rem'
            }}
          >
            🗑
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close chat"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #93a0bd)',
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '6px',
              fontSize: '1rem',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Chat Messages Body ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem',
          background: 'rgba(0,0,0,0.2)'
        }}
      >
        {loading && messages.length === 0 ? (
          <div style={{ margin: 'auto', color: 'var(--text-secondary, #93a0bd)', fontSize: '0.8rem' }}>
            Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary, #93a0bd)', fontSize: '0.8rem', padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>💬</div>
            No messages yet. Say hello to {friendName}!
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMine = String(m.from_user) === String(currentUserId);
            const timeStr = m.sent_at
              ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            const statusLabel = isMine
              ? m.status === 'delivered'
                ? ' · ✓✓ Delivered'
                : ' · ✓ Sent'
              : '';

            return (
              <div
                key={m.id || idx}
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor: isMine ? 'var(--accent-purple, #7c3aed)' : 'var(--bg-secondary, #1b2334)',
                    color: '#fff',
                    fontSize: '0.84rem',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    boxShadow: isMine ? '0 2px 8px rgba(124,58,237,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
                    border: isMine ? 'none' : '1px solid var(--border-primary, rgba(255,255,255,0.08))'
                  }}
                >
                  {m.body}
                </div>
                <div
                  style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-muted, #72809b)',
                    marginTop: '0.15rem',
                    padding: '0 0.2rem'
                  }}
                >
                  {timeStr}
                  {statusLabel}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.74rem',
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.1)',
            borderTop: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          {error}
        </div>
      )}

      {/* ── Quick Emote Drawer ── */}
      {showEmotes && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            padding: '0.5rem 0.8rem',
            backgroundColor: 'var(--bg-secondary, #171d2c)',
            borderTop: '1px solid var(--border-primary, rgba(255,255,255,0.08))'
          }}
        >
          {emotes.map((e) => (
            <button
              key={e}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '0.2rem'
              }}
              onClick={() => {
                setText((prev) => prev + e);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* ── Chat Footer / Input ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.45rem',
          padding: '0.65rem 0.85rem',
          borderTop: '1px solid var(--border-primary, rgba(255,255,255,0.08))',
          backgroundColor: 'var(--bg-modal, #0f131c)'
        }}
      >
        <button
          type="button"
          onClick={() => setShowEmotes(!showEmotes)}
          title="Emotes"
          style={{
            background: 'none',
            border: '1px solid var(--border-primary, rgba(255,255,255,0.12))',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '0 0.5rem'
          }}
        >
          🙂
        </button>
        <input
          type="text"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          maxLength={1000}
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-secondary, #1b2334)',
            border: '1px solid var(--border-primary, rgba(255,255,255,0.12))',
            borderRadius: '8px',
            color: '#fff',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            backgroundColor: 'var(--accent-purple, #7c3aed)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.85rem',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: text.trim() ? 'pointer' : 'default',
            opacity: text.trim() ? 1 : 0.5
          }}
        >
          Send
        </button>
      </div>

      {/* Styled PlayCarys Modal Card for deleting conversation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Clear Conversation"
        message={`This clears the conversation for YOU only — ${friendName} keeps their copy. Continue?`}
        confirmText="Clear Chat"
        cancelText="Cancel"
        onConfirm={confirmDeleteConversation}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>,
    document.body
  );
}

export default ChatWindow;
