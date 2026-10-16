/*
 * Concepts used in this component:
 *  - Components, Props (session, onChanged), State (the contact directory, which conversation is open,
 *    the message being typed), Events (clicks, typing, Enter), Lists (contact groups, messages),
 *    Hooks (useState, useEffect, useContext), Forms (controlled message box), API calls (load the
 *    people this role may contact, send a message), Context (AdminContext for the toast)
 *
 * "💬 Messages" section of the ☰ drawer, in two levels: first WHO you can talk to (supplied by the
 * server), then the conversation with one of them.
 */
import React, { useState, useEffect, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import {
  fetchDirectory,
  threadWith,
  unreadFrom,
  openThread,
  sendDirectMessage,
  safeHtml
} from '../../../services/adminNotifService';
import { sameId } from '../../../services/adminService';
import { pullServerState } from '../../../services/adminLiveService';

const NOTE = { color: 'var(--text-secondary)', fontSize: '0.78rem', padding: '0.6rem 0' };

export function MessagesSection(props) {
  const { session, onChanged } = props;
  const { toast } = useContext(AdminContext);
  const [directory, setDirectory] = useState(null); // null = loading, 'error' = failed
  const [openWith, setOpenWith] = useState(null); // { id, name } of the open conversation
  const [text, setText] = useState('');

  // Fetched once, when the drawer first exists.
  useEffect(() => {
    fetchDirectory(session.userId)
      .then(setDirectory)
      .catch(() => setDirectory('error'));
  }, [session.userId]);

  function handleOpen(person) {
    openThread(session, person.user_id); // opening a conversation is reading it
    setOpenWith({ id: person.user_id, name: person.user_name });
    onChanged();
  }

  async function handleSend() {
    const body = text.trim();
    if (!body || !openWith) return;
    try {
      await sendDirectMessage(session, openWith.id, body);
      setText('');
      toast.success('Sent');
      // Bring the new message back from the server so it shows in the conversation.
      if (await pullServerState()) onChanged();
    } catch (e) {
      toast.error(e.message);
    }
  }

  let title = '💬 Messages';
  let body;

  if (openWith) {
    // ── Level 2: one conversation ──
    title = '💬 ' + openWith.name;
    const thread = threadWith(session, openWith.id);
    body = (
      <>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', height: '26px', marginBottom: '0.6rem' }} onClick={() => setOpenWith(null)}>← All contacts</button>
        {thread.length ? (
          <div style={{ maxHeight: '15rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.6rem' }}>
            {thread.map((n) => {
              const mine = sameId(n.fromUserId, session.userId);
              return (
                <div
                  key={n.id}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    lineHeight: 1.45,
                    ...(mine
                      ? { background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-primary)' })
                  }}
                >
                  <div style={{ color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: safeHtml(n.msg) }}></div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{n.time || ''}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', padding: '0.5rem 0' }}>No messages yet. Say something.</div>
        )}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <input
            id="msg-reply"
            className="form-input"
            placeholder="Message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            style={{ flex: 1, fontSize: '0.76rem', height: '30px', padding: '0.2rem 0.5rem' }}
          />
          <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem', height: '30px' }} onClick={handleSend}>Send</button>
        </div>
      </>
    );
  } else if (directory === 'error') {
    body = <div style={{ ...NOTE, fontSize: '0.76rem', padding: '0.6rem 0' }}>Could not load contacts.</div>;
  } else if (!directory) {
    // ── Level 1: still loading ──
    body = <div style={NOTE}>Loading…</div>;
  } else if (!directory.groups || !directory.groups.length) {
    body = <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', padding: '0.6rem 0', lineHeight: 1.5 }}>Your role does not send staff messages.</div>;
  } else {
    // ── Level 1: who you can talk to ──
    const groups = directory.groups.filter((g) => g.people.length);
    body = groups.length ? groups.map((g) => (
      <div style={{ marginBottom: '0.7rem' }} key={g.role}>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{g.role}</div>
        {g.people.map((p) => {
          const un = unreadFrom(session, p.user_id);
          return (
            <button
              className="drawer-contact"
              key={p.user_id}
              onClick={() => handleOpen(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '0.4rem 0.55rem', marginBottom: '0.25rem', borderRadius: '9px', background: 'transparent',
                border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: '0.78rem'
              }}
            >
              <span className="drawer-friend-avatar" style={{ width: '26px', height: '26px', fontSize: '0.62rem', flexShrink: 0 }}>
                {p.avatar || String(p.user_name).slice(0, 2).toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user_name}</span>
              {un ? <span style={{ background: 'var(--accent-red)', color: '#fff', fontSize: '0.6rem', fontWeight: 800, borderRadius: '99px', padding: '0.05rem 0.35rem' }}>{un}</span> : null}
            </button>
          );
        })}
      </div>
    )) : <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', padding: '0.6rem 0' }}>Nobody to message yet.</div>;
  }

  return (
    <div className="drawer-section" id="drawer-messages">
      <div style={{ padding: '0.7rem 1rem 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(124,58,237,0.04)' }}>
        <div className="drawer-section-title" id="msg-title">{title}</div>
      </div>
      <div id="msg-body" style={{ padding: '0.6rem 0.85rem' }}>{body}</div>
    </div>
  );
}

export default MessagesSection;
