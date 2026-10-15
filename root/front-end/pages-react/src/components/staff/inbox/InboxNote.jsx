/*
 * Concepts used in this component:
 *  - Components, Props (the message, whether it is read, a callback), Events (button click),
 *    Callbacks (the page decides what "Mark read" does)
 *
 * One message in the staff inbox: avatar, sender, sender's role, time, text, and "Mark read" while
 * unread. An unread message has a blue edge on the left. Same markup and classes as the old page.
 */
import React from 'react';
import { safeHtml } from '../../../services/adminNotifService';
import { timeAgo } from '../../../services/staffInboxService';

export function InboxNote(props) {
  const { note: n, read, onMarkRead } = props;
  const who = n.from || 'System';

  return (
    <div className={'note' + (read ? '' : ' unread')}>
      <div className="note-av">{String(n.avatar || who.slice(0, 2)).toUpperCase()}</div>
      <div className="note-body">
        <div className="note-top">
          <span className="note-from">{who}</span>
          {n.fromRole ? <span className="note-role">{n.fromRole}</span> : null}
          <span className="note-time">{timeAgo(n.time)}</span>
        </div>
        {/* A message may carry <b>, <i>, <br>; everything else is escaped. */}
        <div className="note-msg" dangerouslySetInnerHTML={{ __html: safeHtml(n.msg || '') }}></div>
        {read ? null : (
          <div className="note-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => onMarkRead(n)}>Mark read</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InboxNote;
