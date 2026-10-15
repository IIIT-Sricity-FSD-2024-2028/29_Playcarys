import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import ConfirmModal from '../../components/common/ConfirmModal';
import '../../styles/player/notifications-hub.css';

const TYPE_CONFIG = {
  friend_request: { icon: '👤', label: 'Social', color: '#7c3aed', cat: 'social' },
  invite: { icon: '🎮', label: 'Game Invite', color: '#00d4ff', cat: 'game' },
  tournament: { icon: '🏆', label: 'Tournament', color: '#f59e0b', cat: 'tournament' },
  reward: { icon: '💰', label: 'Reward', color: '#10b981', cat: 'reward' },
  warning: { icon: '⚠️', label: 'Warning', color: '#f59e0b', cat: 'system' },
  ban: { icon: '🚫', label: 'Ban Notice', color: '#ef4444', cat: 'system' },
  report: { icon: '📋', label: 'Report', color: '#6366f1', cat: 'system' },
  escalation: { icon: '📨', label: 'Escalation', color: '#f59e0b', cat: 'system' },
  system: { icon: '🔧', label: 'System', color: '#6b7a99', cat: 'system' }
};

function getTypeConfig(n) {
  if (n.type && TYPE_CONFIG[n.type]) return TYPE_CONFIG[n.type];
  const msg = (n.msg || '').toLowerCase();
  if (msg.includes('warning') || msg.includes('[moderator escalation]')) return TYPE_CONFIG['warning'];
  if (msg.includes('ban')) return TYPE_CONFIG['ban'];
  if (msg.includes('reward') || msg.includes('pcp') || msg.includes('bonus')) return TYPE_CONFIG['reward'];
  if (msg.includes('tournament') || msg.includes('event')) return TYPE_CONFIG['tournament'];
  if (msg.includes('report')) return TYPE_CONFIG['report'];
  if (msg.includes('game') || msg.includes('match') || msg.includes('session')) return TYPE_CONFIG['invite'];
  return TYPE_CONFIG['system'];
}

function formatNotifTime(t) {
  if (!t) return '';
  if (typeof t === 'string' && (t.includes('ago') || t === 'just now')) return t;
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function Notifications() {
  const { user } = useContext(AuthContext);
  const userId = user?.userId ?? user?.id ?? user?.user_id ?? 7;
  const roleName = user?.role || 'player';

  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [toast, setToast] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const getClearedSet = (uid) => {
    try {
      const raw = localStorage.getItem(`playcarys_cleared_notifs_${uid}`);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(userId, roleName);
      const clearedSet = getClearedSet(userId);
      const activeList = Array.isArray(data)
        ? data.filter((n) => !clearedSet.has(n.id) && !clearedSet.has(String(n.id)))
        : [];
      setNotifications(activeList);
    } catch (err) {
      console.warn('Failed to load notifications from backend:', err);
      showToast('Could not load notifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [userId, roleName]);

  const isRead = (n) => {
    if (!n) return true;
    if (n.toUser != null) return Boolean(n.read);
    return Boolean(n.read || (Array.isArray(n.readBy) && n.readBy.includes(userId)));
  };

  const handleMarkRead = async (notifId) => {
    try {
      await notificationService.markAsRead(notifId, userId, roleName, true);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
      showToast('Notification marked as read', 'success');
    } catch (err) {
      showToast('Failed to mark notification as read', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(userId, roleName);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const handleClearAll = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      // 1. Delete direct notifications on the backend
      const directNotifs = notifications.filter((n) => n.toUser != null);
      for (const n of directNotifs) {
        await notificationService.deleteNotification(n.id, userId, roleName).catch(() => {});
      }

      // 2. Add cleared notifications to user-specific cleared set
      try {
        const clearedSet = getClearedSet(userId);
        notifications.forEach((n) => {
          clearedSet.add(n.id);
          clearedSet.add(String(n.id));
        });
        localStorage.setItem(`playcarys_cleared_notifs_${userId}`, JSON.stringify([...clearedSet]));
      } catch (e) {
        console.warn('Could not persist cleared notifications:', e);
      }

      // 3. Immediately clear notifications from state
      setNotifications([]);
      setIsClearModalOpen(false);
      showToast('All notifications cleared', 'info');
    } catch (err) {
      showToast('Failed to clear notifications', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleSendReply = (notifId) => {
    const txt = (replyText[notifId] || '').trim();
    if (!txt) {
      showToast('Reply cannot be empty', 'error');
      return;
    }
    const notif = notifications.find((n) => n.id === notifId);
    if (!notif) return;
    if (!notif.toUser) {
      showToast('This is a platform announcement — it cannot be replied to.', 'error');
      return;
    }

    const updatedReplies = notif.replies ? [...notif.replies] : [];
    updatedReplies.push({
      from: user?.username || 'You',
      msg: txt,
      time: new Date().toISOString()
    });

    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, replies: updatedReplies } : n))
    );
    setReplyText((prev) => ({ ...prev, [notifId]: '' }));
    setReplyOpenId(null);
    showToast('Reply sent successfully', 'success');
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: notifications.length, unread: 0, game: 0, tournament: 0, social: 0, reward: 0, system: 0 };
    notifications.forEach((n) => {
      if (!isRead(n)) counts.unread++;
      const cat = getTypeConfig(n).cat;
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [notifications, userId]);

  // Tab filtered items
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !isRead(n));
    }
    if (activeTab === 'all') {
      return notifications;
    }
    return notifications.filter((n) => getTypeConfig(n).cat === activeTab);
  }, [notifications, activeTab, userId]);

  const TABS = [
    { id: 'all', label: 'All', count: categoryCounts.all },
    { id: 'unread', label: 'Unread', count: categoryCounts.unread },
    { id: 'game', label: '🎮 Game', count: categoryCounts.game },
    { id: 'tournament', label: '🏆 Events', count: categoryCounts.tournament },
    { id: 'social', label: '👥 Social', count: categoryCounts.social },
    { id: 'reward', label: '💰 Rewards', count: categoryCounts.reward },
    { id: 'system', label: '⚙️ System', count: categoryCounts.system }
  ];

  return (
    <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="page-content">
        <div className="page-header-row mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/player/dashboard" className="btn btn-ghost" style={{ padding: '0.5rem 0.8rem', textDecoration: 'none' }}>
              ❮ Dashboard
            </Link>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Orbitron', monospace", fontSize: '2rem' }}>
                🔔 Notification Hub
              </h1>
              <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>
                Stay updated with matches, rewards, and platform alerts
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
              ✓ Mark All Read
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--accent-red)' }}
              onClick={handleClearAll}
            >
              🗑 Clear
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="notif-stats-row" id="notif-stats">
          <div className="notif-stat">
            <div className="notif-stat-val" style={{ color: 'var(--accent-cyan)' }}>
              {categoryCounts.all}
            </div>
            <div className="notif-stat-lbl">Total</div>
          </div>
          <div className="notif-stat">
            <div className="notif-stat-val" style={{ color: 'var(--accent-yellow)' }}>
              {categoryCounts.unread}
            </div>
            <div className="notif-stat-lbl">Unread</div>
          </div>
          <div className="notif-stat">
            <div className="notif-stat-val" style={{ color: 'var(--accent-purple)' }}>
              {categoryCounts.game + categoryCounts.tournament}
            </div>
            <div className="notif-stat-lbl">Game & Events</div>
          </div>
          <div className="notif-stat">
            <div className="notif-stat-val" style={{ color: 'var(--text-secondary)' }}>
              {categoryCounts.system}
            </div>
            <div className="notif-stat-lbl">System</div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="notif-tabs" id="notif-tabs">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={`notif-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
            </div>
          ))}
        </div>

        {/* Notifications Shell */}
        <div className="notif-shell">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-primary)'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>✅</div>
              <h3 style={{ margin: '0 0 0.5rem' }}>
                {activeTab === 'unread' ? 'All caught up!' : 'Nothing here'}
              </h3>
              <p className="text-muted" style={{ margin: 0 }}>
                {activeTab === 'unread'
                  ? 'No unread notifications.'
                  : 'No notifications in this category.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const tc = getTypeConfig(n);
              const notifRead = isRead(n);
              const catClass = `type-${tc.cat}`;
              const isReplyOpen = replyOpenId === n.id;

              return (
                <div
                  key={n.id}
                  className={`notif-item ${notifRead ? '' : 'unread'} ${catClass}`}
                  id={`notif-${n.id}`}
                >
                  <div
                    className="notif-icon-wrap"
                    style={{ background: `${tc.color}18`, border: `1px solid ${tc.color}33` }}
                  >
                    {tc.icon}
                  </div>

                  <div className="notif-body">
                    <div className="notif-msg">{n.msg}</div>
                    <div className="notif-meta">
                      <span className="notif-from-badge">
                        {n.fromRole || 'System'}: {n.from || 'PlayCarys'}
                      </span>
                      <span>{formatNotifTime(n.time || n.created_at)}</span>
                      <span
                        style={{
                          background: `${tc.color}22`,
                          color: tc.color,
                          borderRadius: '99px',
                          padding: '0.1rem 0.45rem',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          border: `1px solid ${tc.color}44`
                        }}
                      >
                        {tc.label}
                      </span>
                    </div>

                    {n.replies && n.replies.length > 0 && (
                      <div
                        style={{
                          marginTop: '0.6rem',
                          borderLeft: '2px solid rgba(255,255,255,0.08)',
                          paddingLeft: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        {n.replies.map((r, rIdx) => (
                          <div key={rIdx} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{r.from}:</strong> {r.msg}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="notif-actions">
                      {n.type === 'friend_request' && !notifRead && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              handleMarkRead(n.id);
                              showToast('Friend request accepted', 'success');
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                              handleMarkRead(n.id);
                              showToast('Friend request declined', 'info');
                            }}
                          >
                            Decline
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setReplyOpenId(isReplyOpen ? null : n.id)}
                      >
                        💬 Reply
                      </button>

                      {!notifRead && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => handleMarkRead(n.id)}
                        >
                          ✓ Read
                        </button>
                      )}
                    </div>

                    {isReplyOpen && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <textarea
                          className="notif-reply-input"
                          rows="2"
                          placeholder="Write a reply…"
                          value={replyText[n.id] || ''}
                          onChange={(e) =>
                            setReplyText((prev) => ({ ...prev, [n.id]: e.target.value }))
                          }
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleSendReply(n.id)}
                          >
                            Send
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => setReplyOpenId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!notifRead && <div className="notif-unread-dot"></div>}
                </div>
              );
            })
          )}
        </div>

        {/* Floating Toast */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              zIndex: 9999,
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.88rem',
              boxShadow: 'var(--shadow-modal)',
              background:
                toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6'
            }}
          >
            {toast.message}
          </div>
        )}

        {/* Clear Notifications Confirmation Modal */}
        <ConfirmModal
          isOpen={isClearModalOpen}
          title="Clear Notifications"
          message="Are you sure you want to permanently clear all notifications?"
          confirmText="Confirm"
          cancelText="Cancel"
          confirmStyle="danger"
          loading={isClearing}
          loadingText="Clearing..."
          onCancel={() => {
            if (!isClearing) {
              setIsClearModalOpen(false);
            }
          }}
          onConfirm={handleConfirmClear}
        />
      </div>
    </div>
  );
}

export default Notifications;

