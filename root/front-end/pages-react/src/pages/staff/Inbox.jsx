/*
 * Concepts used in this component:
 *  - Components (the message row and the "New message" card), Props (data and callbacks passed
 *    down), Lists (one row per message), Events (button clicks), Hooks (useContext, useEffect),
 *    Context (AuthContext for the user, AdminContext for toasts and redraw), API calls (a refresh
 *    from the server every 5 seconds), Callbacks (Mark read handlers)
 *
 * Mirrors pages/staff/inbox.html: the inbox of staff accounts (admin, superuser, moderator,
 * publisher). Left: your messages and platform alerts, newest first, unread ones marked. Right: write
 * a new message to someone your role is allowed to contact.
 */
import React, { useContext, useEffect } from 'react';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext';
import InboxNote from '../../components/staff/inbox/InboxNote';
import DirectoryPanel from '../../components/staff/inbox/DirectoryPanel';
import { notifIsRead, markNotificationRead, markAllRead } from '../../services/adminNotifService';
import { myNotifications, countUnread } from '../../services/staffInboxService';
import { pullServerState } from '../../services/adminLiveService';

export function Inbox() {
  const { user } = useContext(AuthContext);
  const { toast, refresh } = useContext(AdminContext); // also redraws this page when refresh() is called

  useEffect(() => {
    document.title = 'PlayCarys — Staff Inbox';
  }, []);

  // Alerts arrive while the page is open (a review request, an escalation): ask the server for news
  // and redraw if anything changed. The navbar does this too for admin / moderator / superuser;
  // this keeps it working for a publisher as well.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      if (await pullServerState()) refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const rows = myNotifications(user);
  const unread = countUnread(rows, user);

  function handleMarkRead(n) {
    markNotificationRead(n, user.userId);
    refresh();
  }

  function handleMarkAll() {
    markAllRead(user.userId, user.role);
    refresh();
    toast.success('All caught up');
  }

  let sub = 'Nothing here yet';
  if (rows.length) {
    sub = `${rows.length} message${rows.length === 1 ? '' : 's'} · ${unread} unread`;
  }

  return (
    <div className="container" style={{ paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>📬 Inbox</h1>
          <p className="text-muted" style={{ margin: '.25rem 0 0', fontSize: '.85rem' }} id="inbox-sub">
            {sub}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={handleMarkAll}>
          Mark all read
        </button>
      </div>

      <div className="inbox-grid">
        <div>
          <div id="inbox-list">
            {rows.length ? (
              rows.map((n) => (
                <InboxNote key={n.id} note={n} read={notifIsRead(n, user.userId)} onMarkRead={handleMarkRead} />
              ))
            ) : (
              <div className="inbox-empty">
                No messages. Platform alerts and escalations from other staff arrive here.
              </div>
            )}
          </div>
        </div>

        <DirectoryPanel user={user} />
      </div>
    </div>
  );
}

export default Inbox;
