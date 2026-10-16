/*
 * Concepts used in this component:
 *  - Components, Props (notification, session, leaving, onMarkRead, onReply), State (the reply being
 *    typed), Events (typing, Enter key, clicks), Forms (controlled reply box), Hooks (useState,
 *    useRef, useEffect), Callbacks (onMarkRead / onReply go up to the section)
 *
 * One unread notification in the drawer: who sent it, what it says, earlier replies, and either a
 * reply box or a "read-only" note, plus "✓ Read". Once read, the row fades and folds away.
 */
import React, { useState, useRef, useEffect } from 'react';
import { canReplyTo, readOnlyText, safeHtml } from '../../../services/adminNotifService';

export function NotificationItem(props) {
  const { notification: n, session, leaving, onMarkRead, onReply } = props;
  const [reply, setReply] = useState('');
  const rowRef = useRef(null);

  const isDM = n.toUser != null;
  const isMod = n.fromRole === 'moderator';
  const canReply = canReplyTo(n, session.role);
  const from = n.from || '';

  // When the row is read: fix its height, then let it fade and collapse (the old _smoothRemoveNotif).
  useEffect(() => {
    if (!leaving || !rowRef.current) return undefined;
    const el = rowRef.current;
    const h = el.offsetHeight;
    el.style.maxHeight = h + 'px';
    el.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.25s ease, max-height 0.4s ease 0.15s, padding 0.4s ease 0.15s, margin 0.4s ease 0.15s';
      el.style.opacity = '0';
      el.style.maxHeight = '0';
      el.style.padding = '0';
      el.style.borderBottomWidth = '0';
    });
    return () => cancelAnimationFrame(frame);
  }, [leaving]);

  return (
    <div
      id={'notif-item-' + n.id}
      ref={rowRef}
      style={{
        padding: '0.75rem 0',
        borderBottom: '1px solid var(--border-primary)',
        overflow: 'hidden',
        transition: 'opacity 0.25s ease,max-height 0.4s ease 0.2s,padding 0.4s ease 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <div className="drawer-friend-avatar" style={{ width: '28px', height: '28px', fontSize: '0.68rem', flexShrink: 0 }}>
          {n.avatar || from.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{from}</div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {n.time}
            {isDM ? <span style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent-purple)', borderRadius: '99px', padding: '0 0.3rem', fontSize: '0.62rem', fontWeight: 700 }}>📩 DM</span> : null}
            {isMod ? <span style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--accent-red)', borderRadius: '99px', padding: '0 0.3rem', fontSize: '0.62rem', fontWeight: 700 }}>🛡️ MOD</span> : null}
          </div>
        </div>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', flexShrink: 0, boxShadow: '0 0 6px rgba(0,212,255,0.6)' }}></span>
      </div>

      <div
        style={{ fontSize: '0.79rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.45rem', paddingLeft: '36px' }}
        dangerouslySetInnerHTML={{ __html: safeHtml(n.msg) }}
      ></div>

      {(n.replies || []).length ? (
        <div style={{ paddingLeft: '36px', marginBottom: '0.35rem' }}>
          {n.replies.map((r, i) => (
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontStyle: 'italic', marginTop: '0.1rem' }} key={i}>↳ {r}</div>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '0.4rem', paddingLeft: '36px', alignItems: 'center' }}>
        {canReply ? (
          <>
            <input
              type="text"
              id={'reply-' + n.id}
              className="form-input"
              placeholder="Reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onReply(n.id, reply)) setReply('');
              }}
              style={{ flex: 1, fontSize: '0.75rem', padding: '0.2rem 0.45rem', height: '26px' }}
            />
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', height: '26px' }}
              onClick={() => {
                if (onReply(n.id, reply)) setReply('');
              }}
            >
              Send
            </button>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>{readOnlyText(n)}</div>
        )}
        {!leaving ? (
          <button
            id={'read-btn-' + n.id}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', height: '26px', transition: 'opacity 0.2s' }}
            onClick={() => onMarkRead(n.id)}
            title="Mark read"
          >
            ✓ Read
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default NotificationItem;
