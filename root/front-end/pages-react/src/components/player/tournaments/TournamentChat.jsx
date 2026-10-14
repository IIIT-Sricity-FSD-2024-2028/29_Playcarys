import React, { useState, useEffect, useRef } from 'react';
import { tournamentService } from '../../../services/tournamentService';

export function TournamentChat({ tournamentId, userId, isRegistered, onShowToast }) {
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const logRef = useRef(null);

  const fetchMessages = () => {
    if (!tournamentId) return;
    tournamentService
      .fetchChat(tournamentId)
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMessages();
    const timer = setInterval(() => {
      if (!document.hidden) {
        fetchMessages();
      }
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [tournamentId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const trimmed = chatInput.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setChatInput('');

    try {
      await tournamentService.sendChat(tournamentId, userId, trimmed);
      fetchMessages();
    } catch (err) {
      setChatInput(trimmed); // restore text on failure
      if (onShowToast) {
        onShowToast(err.message || 'Could not send message.', 'error');
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="info-section" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', fontFamily: "'Orbitron', monospace", color: '#fff' }}>
        💬 Tournament Chat
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.4rem 0 0.75rem' }}>
        Everyone registered for this tournament sees this thread.
      </p>

      <div
        ref={logRef}
        id="tourn-chat-log"
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          marginBottom: '0.75rem',
          padding: '0.5rem',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)'
        }}
      >
        {messages.length > 0 ? (
          messages.map((m, i) => (
            <div key={m.id || i} style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {m.from_name || 'Player'}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.66rem', marginLeft: '0.4rem' }}>
                {m.sent_at
                  ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
              <div style={{ color: 'var(--text-primary)', marginTop: '0.1rem' }}>{m.body}</div>
            </div>
          ))
        ) : (
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            No messages yet.
          </p>
        )}
      </div>

      {isRegistered ? (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input
            id="tourn-chat-input"
            className="form-input"
            maxLength={500}
            placeholder="Say something…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSend}
            disabled={sending}
            type="button"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      ) : (
        <p className="text-muted text-sm" style={{ margin: 0 }}>
          Register for this tournament to join the chat.
        </p>
      )}
    </div>
  );
}

export default TournamentChat;
