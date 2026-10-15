import React from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return '—';
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function RoleBadge(props) {
  const { role } = props;
  const roleLower = String(role || 'player').toLowerCase();
  const map = {
    superuser: 'badge-superuser',
    admin: 'badge-admin',
    moderator: 'badge-moderator',
    publisher: 'badge-publisher',
    player: 'badge-player'
  };
  const cls = map[roleLower] || 'badge-player';
  return <span className={`badge ${cls}`}>{capitalize(roleLower)}</span>;
}

function StatusBadge(props) {
  const { status } = props;
  const s = String(status || 'active').toLowerCase();
  if (s === 'banned') {
    return <span className="badge badge-banned">Banned</span>;
  }
  if (s === 'suspended') {
    return <span className="badge-suspended">⏸ Suspended</span>;
  }
  return <span className="badge badge-active">Active</span>;
}

export function SuperuserUsersTable(props) {
  const {
    users = [],
    currentUser = null,
    search = '',
    onSearchChange,
    roleFilter = '',
    onRoleFilterChange,
    statusFilter = '',
    onStatusFilterChange,
    onEditUser
  } = props;

  const currentUserId = currentUser ? String(currentUser.userId ?? currentUser.id) : null;

  return (
    <div className="card mt-3" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Filters header */}
      <div className="filter-bar">
        <div className="search-wrap" style={{ maxWidth: '260px' }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-input"
            id="search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          id="role-filter"
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          style={{ width: '150px' }}
        >
          <option value="">All Roles</option>
          <option value="superuser">Superuser</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="publisher">Publisher</option>
          <option value="player">Player</option>
        </select>
        <select
          className="form-select"
          id="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          style={{ width: '140px' }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            {users.length > 0 ? (
              users.map((u) => {
                const uId = String(u.user_id ?? u.id);
                const isSelf = currentUserId && (currentUserId === uId || (currentUser?.username && currentUser.username.toLowerCase() === u.username.toLowerCase()));

                return (
                  <tr key={u.id || u.user_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="avatar avatar-sm">{u.avatar || u.username.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {u.username}
                            {isSelf && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginLeft: '0.35rem' }}>
                                (you)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {formatDate(u.joinDate)}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {formatDate(u.lastSeen)}
                    </td>
                    <td>
                      {!isSelf ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onEditUser(u)}
                        >
                          ✏️ Edit
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SuperuserUsersTable;
