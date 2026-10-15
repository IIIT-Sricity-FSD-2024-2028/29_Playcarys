import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../../services/notificationService';
import '../../../styles/player/notifications.css';

export function NotificationDropdown({ userId, roleName = 'player' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'

  const containerRef = useRef(null);
  const navigate = useNavigate();

  const uid = Number(userId || 7);
  const role = roleName || 'player';

  // Fetch unread count & initial data from backend
  const refreshNotifications = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const [list, count] = await Promise.all([
        notificationService.getNotifications(uid, role).catch(() => []),
        notificationService.getUnreadCount(uid, role).catch(() => 0)
      ]);
      setNotifications(Array.isArray(list) ? list : []);
      setUnreadCount(typeof count === 'number' ? count : (list.filter((n) => !isRead(n)).length));
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Could not load notifications from backend');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    refreshNotifications(false);

    const handleEvent = () => refreshNotifications(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('notifications-marked-read', handleEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('notifications-marked-read', handleEvent);
      }
    };
  }, [uid, role]);

  // When dropdown opens, refresh list to ensure latest data
  useEffect(() => {
    if (isOpen) {
      refreshNotifications(true);
    }
  }, [isOpen]);

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Check read status handling direct and broadcasts
  const isRead = (notif) => {
    if (!notif) return true;
    if (notif.toUser != null) {
      return Boolean(notif.read);
    }
    // Broadcast notification: check per-user readBy array or fallback
    return Boolean(notif.read || (Array.isArray(notif.readBy) && notif.readBy.includes(uid)));
  };

  // Mark single notification as read
  const handleMarkRead = async (notif, e) => {
    if (e) e.stopPropagation();
    if (isRead(notif)) return;
    try {
      await notificationService.markAsRead(notif.id, uid, role, true);
      // Authoritative refresh from server
      await refreshNotifications(false);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async (e) => {
    if (e) e.stopPropagation();
    if (unreadCount === 0 || actionLoading) return;
    try {
      setActionLoading(true);
      await notificationService.markAllAsRead(uid, role);
      await refreshNotifications(false);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete notification (direct notifications only)
  const handleDelete = async (notif, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.deleteNotification(notif.id, uid, role);
      await refreshNotifications(false);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Resolve actionable destination
  const getDestination = (notif) => {
    const msg = (notif.msg || '').toLowerCase();
    const type = (notif.type || '').toLowerCase();

    if (type === 'group_join_request' || msg.includes('clan') || msg.includes('group') || msg.includes('team')) {
      return { path: '/player/community', label: '🛡️ View Community' };
    }
    if (msg.includes('tournament') || msg.includes('grand prix') || msg.includes('championship') || msg.includes('cup') || msg.includes('pcp') || msg.includes('rank #')) {
      return { path: '/player/tournaments', label: '🏆 View Tournaments' };
    }
    if (msg.includes('friend') || msg.includes('report') || msg.includes('moderator')) {
      return { path: '/player/profile', label: '👤 View Profile' };
    }
    if (msg.includes('game') || msg.includes('review') || msg.includes('published')) {
      return { path: '/player/games', label: '🎮 View Games' };
    }
    return null;
  };

  const handleNavigateDestination = (dest, notif, e) => {
    if (e) e.stopPropagation();
    if (!isRead(notif)) {
      handleMarkRead(notif);
    }
    setIsOpen(false);
    navigate(dest.path);
  };

  // Filtered notifications
  const displayedNotifs = notifications.filter((n) => {
    if (filterTab === 'unread') return !isRead(n);
    return true;
  });

  return (
    <div className="notif-dropdown-wrapper" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span className="notif-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="notif-dropdown-panel" role="dialog" aria-label="Notifications Panel">
          {/* Header */}
          <div className="notif-panel-header">
            <div className="notif-panel-title">
              <span>🔔 Notifications</span>
              {unreadCount > 0 && <span className="notif-chip">{unreadCount} unread</span>}
            </div>
            <div className="notif-panel-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '99px',
                  color: unreadCount > 0 ? 'var(--accent-cyan, #00d4ff)' : 'var(--text-muted, #72809b)',
                  border: unreadCount > 0 ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: unreadCount > 0 && !actionLoading ? 'pointer' : 'default',
                  opacity: unreadCount > 0 ? 1 : 0.6,
                  fontWeight: 700
                }}
                onClick={handleMarkAllRead}
                disabled={actionLoading || unreadCount === 0}
                title="Mark all notifications as read"
              >
                {actionLoading ? 'Marking…' : '✓ Mark all read'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="notif-panel-tabs">
            <button
              type="button"
              className={`notif-tab-btn ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`notif-tab-btn ${filterTab === 'unread' ? 'active' : ''}`}
              onClick={() => setFilterTab('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Body */}
          <div className="notif-panel-body">
            {loading ? (
              <div className="notif-empty-state">
                <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: 'var(--accent-cyan)' }}>⏳</div>
                <div className="notif-empty-text">Loading notifications…</div>
              </div>
            ) : error ? (
              <div className="notif-empty-state">
                <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem', color: 'var(--accent-red)' }}>⚠️</div>
                <div className="notif-empty-text">{error}</div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.6rem', fontSize: '0.75rem' }}
                  onClick={() => refreshNotifications(true)}
                >
                  Retry
                </button>
              </div>
            ) : displayedNotifs.length === 0 ? (
              <div className="notif-empty-state">
                <div className="notif-empty-icon">
                  {filterTab === 'unread' ? '🎉' : '📭'}
                </div>
                <div className="notif-empty-text">
                  {filterTab === 'unread' ? "You're all caught up!" : 'No notifications yet'}
                </div>
              </div>
            ) : (
              displayedNotifs.map((notif) => {
                const read = isRead(notif);
                const dest = getDestination(notif);
                const fromName = notif.from || (notif.fromRole ? notif.fromRole.toUpperCase() : 'System');
                const avatar = notif.avatar || fromName.slice(0, 2).toUpperCase();
                const isDirect = notif.toUser != null;

                return (
                  <div
                    key={notif.id}
                    className={`notif-card ${!read ? 'is-unread' : ''}`}
                    onClick={() => {
                      if (!read) handleMarkRead(notif);
                    }}
                  >
                    <div className="notif-avatar">{avatar}</div>

                    <div className="notif-content">
                      <div className="notif-meta-row">
                        <div className="notif-from">
                          <span>{fromName}</span>
                          {notif.fromRole && (
                            <span className="notif-role-badge">{notif.fromRole}</span>
                          )}
                        </div>
                        <span className="notif-time">{notif.time || 'Recent'}</span>
                      </div>

                      {/* Message body with safe sanitized HTML rendering or text */}
                      <div
                        className="notif-message"
                        dangerouslySetInnerHTML={{ __html: notif.msg || '' }}
                      />

                      {/* Action buttons */}
                      <div className="notif-controls">
                        {dest && (
                          <button
                            type="button"
                            className="notif-action-btn"
                            onClick={(e) => handleNavigateDestination(dest, notif, e)}
                          >
                            {dest.label} →
                          </button>
                        )}
                        {!read && (
                          <button
                            type="button"
                            className="notif-read-btn"
                            onClick={(e) => handleMarkRead(notif, e)}
                            title="Mark as read"
                          >
                            ✓ Read
                          </button>
                        )}
                        {isDirect && (
                          <button
                            type="button"
                            className="notif-del-btn"
                            onClick={(e) => handleDelete(notif, e)}
                            title="Delete notification"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
