/*
 * Concepts used in this component:
 *  - Components, Props (session, unreadLabel, onChanged), State (rows that are fading out), Lists
 *    (one row per unread notification), Events (Read / Send / Mark all read), Hooks (useState,
 *    useContext), Context (AdminContext for the toast), Callbacks (onChanged tells the navbar to
 *    recount its badge), prop drilling (handlers go on to each NotificationItem)
 *
 * "🔔 Notifications" section of the ☰ drawer: everything addressed to this admin that is unread,
 * "Mark all read", and replying to a message.
 */
import React, { useState, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  replyToNotification
} from '../../../features/notifications/notificationSlice';
import NotificationItem from './NotificationItem';
import {
  notifIsVisible,
  notifIsRead
} from '../../../services/adminNotifService';

export function NotificationsSection(props) {
  const dispatch = useAppDispatch();
  const { session, unreadLabel, onChanged } = props;
  const { toast } = useContext(AdminContext);
  const [leaving, setLeaving] = useState([]); // ids of rows that were just read and are fading out
  const notifications = useAppSelector((state) => Object.values(state.notifications?.entities || {}).filter(Boolean));

  React.useEffect(() => {
    dispatch(fetchUserNotifications({ userId: session.userId, roleName: session.role }));
  }, [dispatch, session.role, session.userId]);

  const unread = notifications.filter((n) => notifIsVisible(n, session.userId, session.role) && !notifIsRead(n, session.userId));
  // A row that was just read stays on screen while it fades.
  const rows = notifications.filter((n) => notifIsVisible(n, session.userId, session.role)).filter(
    (n) => unread.includes(n) || leaving.includes(n.id)
  );

  function fadeOut(id) {
    setLeaving((list) => [...list, id]);
    setTimeout(() => setLeaving((list) => list.filter((x) => x !== id)), 600);
  }

  async function handleMarkRead(id) {
    try {
      await dispatch(markNotificationRead({ id, audience: { userId: session.userId, roleName: session.role } })).unwrap();
    } catch (err) {
      toast.error(err || 'Unable to mark notification read');
      return;
    }
    onChanged();
    fadeOut(id);
  }

  // Returns true when the reply was sent, so the row can clear its box.
  async function handleReply(id, text) {
    if (!text.trim()) return false;
    try {
      await dispatch(replyToNotification({ notificationId: id, text: text.trim(), userId: session.userId, roleName: session.role })).unwrap();
    } catch (err) {
      toast.error(err || 'Unable to send reply');
      return false;
    }
    onChanged();
    toast.success('Reply sent!');
    fadeOut(id);
    return true;
  }

  async function handleMarkAll() {
    try {
      await dispatch(markAllNotificationsRead({ userId: session.userId, roleName: session.role })).unwrap();
    } catch (err) {
      toast.error(err || 'Unable to mark notifications read');
      return;
    }
    onChanged();
    toast.info('All notifications marked as read');
  }

  return (
    <div className="drawer-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 1rem 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(239,68,68,0.03)' }}>
        <div className="drawer-section-title">🔔 Notifications <span id="drawer-badge" style={{ display: unread.length > 0 ? 'inline-block' : 'none', background: 'var(--accent-red)', color: '#fff', fontSize: '0.6rem', padding: '0.05rem 0.35rem', borderRadius: '99px', fontWeight: 800, marginLeft: '0.25rem' }}>{unreadLabel}</span></div>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', height: '22px' }} onClick={handleMarkAll}>Mark all read</button>
      </div>
      <div id="notif-list" style={{ padding: '0 0.25rem' }}>
        {rows.length ? (
          rows.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              session={session}
              leaving={leaving.includes(n.id)}
              onMarkRead={handleMarkRead}
              onReply={handleReply}
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>💭 All caught up!</div>
        )}
      </div>
    </div>
  );
}

export default NotificationsSection;
