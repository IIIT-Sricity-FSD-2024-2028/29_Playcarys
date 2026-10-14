/*
 * Concepts used in this component:
 *  - Components, Props (users, viewerRole, onManage), Lists (one row per user),
 *    Events (Manage click), Callbacks (onManage gets the user id)
 *
 * The list of users in the old users.html. An admin cannot manage a superuser:
 * that row shows "System restricted" instead of the Manage button.
 */
import React from 'react';
import StatusBadge from '../common/StatusBadge';

export function UserList(props) {
  const { users, viewerRole, onManage } = props;

  if (!users.length) {
    return (
      <div id="user-list">
        <div className="empty-state"><div className="icon">👥</div><h3>No users found</h3><p>No users match your filters</p></div>
      </div>
    );
  }

  return (
    <div id="user-list">
      {users.map((u) => {
        const canManage = !(viewerRole === 'admin' && u.role === 'superuser');
        return (
          <div className="list-item" key={u.id}>
            <div className="avatar">{u.avatar}</div>
            <div className="list-item-info">
              <div className="list-item-title">{u.username}</div>
              <div className="list-item-sub">
                <span>{u.email}</span>
                <StatusBadge status={u.role} />
                {u.status === 'banned' ? <StatusBadge status="banned" /> : u.status === 'suspended' ? <StatusBadge status="suspended" /> : null}
              </div>
            </div>
            <div className="list-item-actions">
              {canManage ? (
                <button className="btn btn-outline btn-sm" onClick={() => onManage(u.id)}>⚙️ Manage</button>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingRight: '0.5rem' }}>🔒 System restricted</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default UserList;
