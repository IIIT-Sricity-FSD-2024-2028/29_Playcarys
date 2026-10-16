import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import {
  fetchUsers,
  createUserRecord,
  updateUserRole,
  updateUserStatus,
  sendUserNotification
} from '../../services/superuserService';
import AdminKPIs from '../../components/superuser/admins/AdminKPIs';
import StaffSection from '../../components/superuser/admins/StaffSection';
import CreateStaffModal from '../../components/superuser/admins/CreateStaffModal';
import StaffActionsModal from '../../components/superuser/admins/StaffActionsModal';
import ConfirmStaffModal from '../../components/superuser/admins/ConfirmStaffModal';
import Toast from '../../components/common/Toast';
import '../../styles/superuser/admins.css';

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function Admins() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmStyle: 'primary',
    onConfirm: null
  });

  // Toast notification state
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

  // Load all users from backend / local DB
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
    document.title = 'PlayCarys — Superuser · Admin Management';

    const currentSession = authService.requireAuth(['superuser']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setUnauthorized(false);
    setSession(currentSession);

    loadData();
  }, []);

  // Compute live KPIs
  const admins = users.filter((u) => u.role === 'admin' || u.role_id === 2);
  const moderators = users.filter((u) => u.role === 'moderator' || u.role_id === 3);
  const suspendedCount = users.filter(
    (u) =>
      (['admin', 'moderator'].includes(u.role) || [2, 3].includes(u.role_id)) &&
      u.status === 'suspended'
  ).length;

  const stats = {
    admins: admins.length,
    moderators: moderators.length,
    suspended: suspendedCount
  };

  const currentUserId = session?.userId ?? session?.id;

  // Handle Account Creation
  async function handleCreateStaff({ username, email, role, password }) {
    try {
      const created = await createUserRecord({ username, email, role, password });
      showToast(`${capitalize(role)} account "${created.username || username}" created`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to create staff account', 'error');
      throw err;
    }
  }

  // Demote Admin to Moderator flow
  function handleDemoteClick(user) {
    setSelectedStaff(null); // Close actions modal
    setTimeout(() => {
      setConfirmModal({
        isOpen: true,
        title: 'Demote to Moderator',
        message: `Demote ${user.username} from Admin to Moderator?`,
        confirmText: 'Demote',
        confirmStyle: 'warning',
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          try {
            const uid = user.user_id ?? user.id;
            await updateUserRole(uid, 'moderator');
            showToast(`${user.username} demoted to Moderator`, 'info');
            await loadData();
          } catch (err) {
            console.error('Demotion failed:', err);
            showToast(err.message || 'Failed to demote user', 'error');
          }
        }
      });
    }, 100);
  }

  // Promote Moderator to Admin flow
  function handlePromoteClick(user) {
    setSelectedStaff(null); // Close actions modal
    setTimeout(() => {
      setConfirmModal({
        isOpen: true,
        title: 'Promote to Admin',
        message: `Promote ${user.username} from Moderator to Admin?`,
        confirmText: 'Promote',
        confirmStyle: 'primary',
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          try {
            const uid = user.user_id ?? user.id;
            await updateUserRole(uid, 'admin');
            showToast(`${user.username} promoted to Admin`, 'success');
            await loadData();
          } catch (err) {
            console.error('Promotion failed:', err);
            showToast(err.message || 'Failed to promote user', 'error');
          }
        }
      });
    }, 100);
  }

  // Suspend Staff flow
  function handleSuspendClick(user, reason) {
    setSelectedStaff(null); // Close actions modal
    setTimeout(() => {
      setConfirmModal({
        isOpen: true,
        title: 'Suspend Account',
        message: `Suspend ${user.username}? They will lose platform access until reinstated.`,
        confirmText: 'Suspend',
        confirmStyle: 'danger',
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          try {
            const uid = user.user_id ?? user.id;
            await updateUserStatus(uid, 'suspended');
            sendUserNotification(
              user.username,
              session?.role || 'superuser',
              session?.username || 'Superuser',
              `Your staff account has been suspended. Reason: ${reason}`
            );
            showToast(`${user.username} suspended`, 'warning');
            await loadData();
          } catch (err) {
            console.error('Suspension failed:', err);
            showToast(err.message || 'Failed to suspend staff member', 'error');
          }
        }
      });
    }, 100);
  }

  // Revoke Suspension flow
  async function handleReinstateClick(user, reason) {
    try {
      const uid = user.user_id ?? user.id;
      await updateUserStatus(uid, 'active');
      sendUserNotification(
        user.username,
        session?.role || 'superuser',
        session?.username || 'Superuser',
        `Your staff account suspension has been revoked. Note: ${reason}`
      );
      showToast(`${user.username} suspension revoked`, 'success');
      setSelectedStaff(null); // Close actions modal
      await loadData();
    } catch (err) {
      console.error('Reinstatement failed:', err);
      showToast(err.message || 'Failed to revoke suspension', 'error');
    }
  }

  if (unauthorized) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Superuser Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            The Superuser Admin Management page requires Superuser privileges.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              navigate('/');
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
          <h1>👑 Admin Management</h1>
          <p className="text-muted">
            Create Admin / Moderator accounts, demote admins or suspend staff
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Create Account
        </button>
      </div>

      {/* KPI Cards */}
      <AdminKPIs stats={stats} />

      {/* Admins Section */}
      <StaffSection
        title="👑 Admins"
        titleColor="var(--accent-cyan)"
        users={admins}
        currentUserId={currentUserId}
        onOpenActions={(u) => setSelectedStaff(u)}
        className="mb-3"
      />

      {/* Moderators Section */}
      <StaffSection
        title="🛡️ Moderators"
        titleColor="var(--accent-purple)"
        users={moderators}
        currentUserId={currentUserId}
        onOpenActions={(u) => setSelectedStaff(u)}
      />

      {/* Create Staff Account Modal */}
      <CreateStaffModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateStaff={handleCreateStaff}
        users={users}
      />

      {/* Staff Actions Modal */}
      <StaffActionsModal
        isOpen={!!selectedStaff}
        user={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        onDemoteClick={handleDemoteClick}
        onPromoteClick={handlePromoteClick}
        onSuspendClick={handleSuspendClick}
        onReinstateClick={handleReinstateClick}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* Confirmation Modal */}
      <ConfirmStaffModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmStyle={confirmModal.confirmStyle}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notifications */}
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

export default Admins;
