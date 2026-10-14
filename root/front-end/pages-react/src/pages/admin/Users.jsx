/*
 * Concepts used in this component:
 *  - Components, Props (values and handlers passed to children), State (filters, dialog, form,
 *    errors, action inputs), Events (clicks, typing), Lists (filtered users), Hooks (useState,
 *    useEffect, useContext), Forms (controlled add/edit form with validation), Context (AdminContext
 *    for toast / confirm / redraw), Callbacks (confirmAction runs the action only after "Confirm"),
 *    prop drilling (handlers go page → modal → actions panel)
 *
 * Mirrors pages/admin/users.html (Role Management).
 */
import React, { useState, useEffect, useContext } from 'react';
import AdminContext from '../../context/AdminContext';
import UserStats from '../../components/admin/users/UserStats';
import UserFilters from '../../components/admin/users/UserFilters';
import UserList from '../../components/admin/users/UserList';
import UserFormModal from '../../components/admin/users/UserFormModal';
import { validateField } from '../../services/adminValidation';
import { getSession, getPlatformStats } from '../../services/adminService';
import {
  listUsers,
  findUserById,
  isUsernameTaken,
  isEmailTaken,
  updateUser,
  createUser,
  suspendUser,
  revokeSuspension,
  banUser,
  banAndDeleteUser,
  unbanUser
} from '../../services/adminUserService';

const EMPTY_FORM = { username: '', email: '', role: 'player', password: '', status: 'active' };
const NO_ERRORS = { username: '', email: '', password: '' };

export function Users() {
  const { toast, confirmAction, refresh } = useContext(AdminContext);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(''); // '' means "Add User"
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState(NO_ERRORS);
  const [reason, setReason] = useState('');
  const [suspendDays, setSuspendDays] = useState('');

  useEffect(() => {
    document.title = 'PlayCarys — Role Management';
  }, []);

  const me = getSession() || { role: 'player' };
  const isEdit = !!editId;
  const editUser = isEdit ? findUserById(editId) : null;

  // ── Opening and closing the dialog ──────────────────────────────
  function openAddUser() {
    setEditId('');
    setForm(EMPTY_FORM);
    setErrors(NO_ERRORS);
    setReason('');
    setSuspendDays('');
    setModalOpen(true);
  }

  function openEditUser(id) {
    const u = findUserById(id);
    if (!u) return;
    if (me.role === 'admin' && u.role === 'superuser') {
      toast.error('Admins cannot modify Superuser accounts.');
      return;
    }
    setEditId(u.id);
    setForm({ username: u.username, email: u.email, role: u.role, password: '', status: u.status });
    setErrors(NO_ERRORS);
    setReason('');
    setSuspendDays('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  // Typing in a field clears that field's error, like the old page.
  function handleFieldChange(field, value) {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  }

  // Close the dialog and redraw the list and the numbers after a change.
  function finishChange() {
    closeModal();
    refresh();
  }

  // ── Add / Save ──────────────────────────────────────────────────
  function handleSave() {
    const usernameMsg = validateField(form.username, [{ type: 'required' }, { type: 'minLen', n: 3 }, { type: 'maxLen', n: 20 }]);
    const emailMsg = validateField(form.email, [{ type: 'required' }, { type: 'email' }]);
    const passwordMsg = isEdit ? '' : validateField(form.password, [{ type: 'required' }, { type: 'password' }]);
    setErrors({ username: usernameMsg, email: emailMsg, password: passwordMsg });
    if (usernameMsg || emailMsg || passwordMsg) return;

    const username = form.username.trim();
    const email = form.email.trim();

    if (isUsernameTaken(username, editId)) {
      setErrors({ username: 'Username already taken', email: '', password: '' });
      return;
    }
    if (isEmailTaken(email, editId)) {
      setErrors({ username: '', email: 'Email already registered', password: '' });
      return;
    }

    if (isEdit) {
      updateUser(editId, username, email, form.role, form.status);
      toast.success('User updated successfully');
    } else {
      createUser(username, email, form.role, form.status, form.password);
      toast.success('User added successfully');
    }
    finishChange();
  }

  // ── Administrative actions (each one needs a written reason) ─────
  function getReason() {
    const r = reason.trim();
    if (!r) {
      toast.error('Action Reason is required.');
      return '';
    }
    return r;
  }

  function handleWarn() {
    toast.warning(`Warning issued to Admin ${editUser.username}`);
    closeModal();
  }

  function handleSuspend() {
    const u = editUser;
    const days = suspendDays || 1;
    const r = getReason();
    if (!r) return;
    confirmAction('Suspend User', `Suspend ${u.username} for ${days} days?`, () => {
      suspendUser(u, days, r);
      toast.success(`${u.username} suspended for ${days} days`);
      finishChange();
    });
  }

  function handleRevoke() {
    const u = editUser;
    const r = getReason();
    if (!r) return;
    revokeSuspension(u, r);
    toast.success(`${u.username} suspension revoked`);
    finishChange();
  }

  function handleBan() {
    const u = editUser;
    const r = getReason();
    if (!r) return;
    confirmAction('Ban User', `Permanently ban ${u.username}? They will lose access to the platform.`, () => {
      banUser(u, r);
      toast.success(`${u.username} has been permanently banned`);
      finishChange();
    });
  }

  function handleBanDelete() {
    const u = editUser;
    const r = getReason();
    if (!r) return;
    confirmAction('Ban & Delete User', `Permanently ban AND delete ${u.username}? This action is irreversible.`, () => {
      banAndDeleteUser(u, r);
      toast.success(`${u.username} banned and deleted`);
      finishChange();
    });
  }

  function handleUnban() {
    const u = editUser;
    unbanUser(u);
    toast.success(`${u.username} has been unbanned`);
    finishChange();
  }

  return (
    <>
      <div className="page-content">
        <div className="page-header-row">
          <div>
            <h1>Role Management</h1>
            <p className="text-muted">Manage user roles and permissions</p>
          </div>
          <button className="btn btn-primary" onClick={openAddUser}>+ Add User</button>
        </div>

        <UserStats stats={getPlatformStats()} />

        <UserFilters
          search={search}
          onSearchChange={setSearch}
          role={roleFilter}
          onRoleChange={setRoleFilter}
          status={statusFilter}
          onStatusChange={setStatusFilter}
        />

        <UserList users={listUsers(search, roleFilter, statusFilter)} viewerRole={me.role} onManage={openEditUser} />
      </div>

      <UserFormModal
        open={modalOpen}
        isEdit={isEdit}
        editUser={editUser}
        form={form}
        errors={errors}
        onFieldChange={handleFieldChange}
        onClose={closeModal}
        onSave={handleSave}
        actions={{
          reason: reason,
          onReasonChange: setReason,
          days: suspendDays,
          onDaysChange: setSuspendDays,
          onWarn: handleWarn,
          onSuspend: handleSuspend,
          onRevoke: handleRevoke,
          onBan: handleBan,
          onBanDelete: handleBanDelete,
          onUnban: handleUnban
        }}
      />
    </>
  );
}

export default Users;
