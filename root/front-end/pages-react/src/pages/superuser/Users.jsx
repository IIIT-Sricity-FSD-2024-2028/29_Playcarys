import React, { useState, useEffect } from 'react';
import authService from '../../services/authService';
import {
  fetchUsers,
  createUserRecord,
  updateUserRecord,
  updateUserStatus,
  sendUserNotification
} from '../../services/superuserService';
import SuperuserUsersKPIs from '../../components/superuser/users/SuperuserUsersKPIs';
import SuperuserUsersTable from '../../components/superuser/users/SuperuserUsersTable';
import SuperuserAddUserModal from '../../components/superuser/users/SuperuserAddUserModal';
import SuperuserEditUserModal from '../../components/superuser/users/SuperuserEditUserModal';
import Toast from '../../components/common/Toast';
import '../../styles/superuser/users.css';

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function Users() {
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal & Toast state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

  // Load data
  async function loadData() {
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Superuser · Users';

    const currentSession = authService.requireAuth(['superuser']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setUnauthorized(false);
    setSession(currentSession);

    loadData();
  }, []);

  // Compute live stats from user list
  const stats = {
    admins: users.filter((u) => u.role === 'admin' || u.role_id === 2).length,
    moderators: users.filter((u) => u.role === 'moderator' || u.role_id === 3).length,
    publishers: users.filter((u) => u.role === 'publisher' || u.role_id === 5).length,
    players: users.filter((u) => u.role === 'player' || u.role_id === 4).length
  };

  // Filter users
  let filtered = [...users];
  const q = search.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }
  if (roleFilter) {
    filtered = filtered.filter((u) => u.role === roleFilter);
  }
  if (statusFilter) {
    filtered = filtered.filter((u) => u.status === statusFilter);
  }

  // Action handlers
  async function handleAddUser(newUserData) {
    try {
      const created = await createUserRecord(newUserData);
      showToast(`User "${created.username}" created as ${capitalize(newUserData.role)}`, 'success');
      await loadData();
    } catch (err) {
      console.error('Failed creating user:', err);
      showToast(err.message || 'Failed to create user', 'error');
    }
  }

  async function handleSaveEdit(user, updateData) {
    try {
      const uid = user.user_id ?? user.id;
      await updateUserRecord(uid, updateData);
      showToast(`${updateData.username} updated`, 'success');
      await loadData();
    } catch (err) {
      console.error('Failed updating user:', err);
      showToast(err.message || 'Failed to update user', 'error');
    }
  }

  async function handleSuspend(user, reason) {
    try {
      const uid = user.user_id ?? user.id;
      await updateUserStatus(uid, 'suspended');
      sendUserNotification(
        user.username,
        session?.role || 'superuser',
        session?.username || 'GodMode',
        `You have been suspended. Reason: ${reason}`
      );
      showToast(`${user.username} suspended`, 'warning');
      await loadData();
    } catch (err) {
      console.error('Failed suspending user:', err);
      showToast(err.message || 'Failed to suspend user', 'error');
    }
  }

  async function handleReinstate(user, reason) {
    try {
      const uid = user.user_id ?? user.id;
      await updateUserStatus(uid, 'active');
      sendUserNotification(
        user.username,
        session?.role || 'superuser',
        session?.username || 'GodMode',
        `Your suspension has been revoked. Note: ${reason}`
      );
      showToast(`${user.username} reinstated`, 'success');
      await loadData();
    } catch (err) {
      console.error('Failed reinstating user:', err);
      showToast(err.message || 'Failed to reinstate user', 'error');
    }
  }

  async function handleBan(user, reason) {
    try {
      const uid = user.user_id ?? user.id;
      await updateUserStatus(uid, 'banned');
      sendUserNotification(
        user.username,
        session?.role || 'superuser',
        session?.username || 'GodMode',
        `You have been permanently banned. Reason: ${reason}`
      );
      showToast(`${user.username} banned`, 'error');
      await loadData();
    } catch (err) {
      console.error('Failed banning user:', err);
      showToast(err.message || 'Failed to ban user', 'error');
    }
  }

  async function handleUnban(user, reason) {
    try {
      const uid = user.user_id ?? user.id;
      await updateUserStatus(uid, 'active');
      sendUserNotification(
        user.username,
        session?.role || 'superuser',
        session?.username || 'GodMode',
        `Your ban has been lifted. Note: ${reason}`
      );
      showToast(`${user.username} unbanned`, 'success');
      await loadData();
    } catch (err) {
      console.error('Failed unbanning user:', err);
      showToast(err.message || 'Failed to unban user', 'error');
    }
  }

  if (unauthorized) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Superuser Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            The Superuser All Users management page requires Superuser privileges.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.href = '/index.html';
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1>👥 All Users</h1>
          <p className="text-muted">View and manage every user on the platform</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          + Add User
        </button>
      </div>

      {/* Role KPIs */}
      <SuperuserUsersKPIs stats={stats} />

      {/* Filters + Table */}
      <SuperuserUsersTable
        users={filtered}
        currentUser={session}
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onEditUser={(u) => setEditingUser(u)}
      />

      {/* Modals */}
      <SuperuserAddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddUser={handleAddUser}
        users={users}
      />

      <SuperuserEditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveEdit}
        onSuspend={handleSuspend}
        onReinstate={handleReinstate}
        onBan={handleBan}
        onUnban={handleUnban}
        users={users}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default Users;
