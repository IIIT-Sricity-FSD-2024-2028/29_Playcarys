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
import { getSession } from '../../services/adminService';
import { useUsers } from '../../features/users/useUsers';
import {
  filterUsers,
  isUsernameTaken,
  isEmailTakenForRole,
  countUsers,
  recordUserEdited,
  recordUserCreated,
  recordSuspended,
  recordSuspensionRevoked,
  recordBanned,
  recordBannedAndDeleted,
  recordUnbanned
} from '../../services/adminUserService';

const EMPTY_FORM = { username: '', email: '', role: 'player', password: '', status: 'active' };
const NO_ERRORS = { username: '', email: '', password: '' };

export function Users() {
  const { toast, confirmAction, refresh } = useContext(AdminContext);
  const { users, status: usersStatus, error: usersError, load, create, update, setStatus, remove } = useUsers();

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
    load().catch((err) => toast.error(err || 'Could not load users'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const me = getSession() || { role: 'player' };
  const isEdit = !!editId;
  const editUser = isEdit ? users.find((u) => String(u.id) === String(editId)) : null;

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
    const u = users.find((x) => String(x.id) === String(id));
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
  async function handleSave() {
    const usernameMsg = validateField(form.username, [{ type: 'required' }, { type: 'minLen', n: 3 }, { type: 'maxLen', n: 20 }]);
    const emailMsg = validateField(form.email, [{ type: 'required' }, { type: 'email' }]);
    const passwordMsg = isEdit ? '' : validateField(form.password, [{ type: 'required' }, { type: 'password' }]);
    const username = form.username.trim();
    const email = form.email.trim();

    // Show every problem at once instead of one per click.
    const nextErrors = {
      username: usernameMsg || (isUsernameTaken(users, username, editId) ? 'Username already taken' : ''),
      email: emailMsg || (isEmailTakenForRole(users, email, form.role, editId) ? 'Email already registered' : ''),
      password: passwordMsg
    };
    setErrors(nextErrors);
    if (nextErrors.username || nextErrors.email || nextErrors.password) return;

    try {
      if (isEdit) {
        await update(editId, { username, email });
        if (editUser && form.status !== editUser.status) {
          await setStatus(editId, form.status);
        }
        recordUserEdited(username, form.role, form.status);
        toast.success('User updated successfully');
      } else {
        const created = await create({ username, email, role: form.role, password: form.password });
        // New accounts start active on the server; an admin can create one as suspended/banned.
        if (form.status && form.status !== 'active') {
          await setStatus(created.id, form.status);
        }
        recordUserCreated(username, form.role, form.status);
        toast.success('User added successfully');
      }
      finishChange();
    } catch (err) {
      toast.error(String(err || 'Could not save the user'));
    }
  }

  // Run a server change, then the legacy-side notification/audit, then close the dialog.
  async function runAction(serverCall, recordCall, successMsg) {
    try {
      await serverCall();
      recordCall();
      toast.success(successMsg);
      finishChange();
    } catch (err) {
      toast.error(String(err || 'The action failed'));
    }
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
    const days = parseInt(suspendDays, 10) || 1;
    if (days < 1 || days > 90) {
      toast.error('Suspension duration must be between 1 and 90 days.');
      return;
    }
    const r = getReason();
    if (!r) return;
    confirmAction('Suspend User', `Suspend ${u.username} for ${days} days?`, () =>
      runAction(
        () => setStatus(u.id, 'suspended'),
        () => recordSuspended(u, days, r),
        `${u.username} suspended for ${days} days`
      )
    );
  }

  function handleRevoke() {
    const u = editUser;
    const r = getReason();
    if (!r) return;
    runAction(
      () => setStatus(u.id, 'active'),
      () => recordSuspensionRevoked(u, r),
      `${u.username} suspension revoked`
    );
  }

  function handleBan() {
    const u = editUser;
    const r = getReason();
    if (!r) return;
    confirmAction('Ban User', `Permanently ban ${u.username}? They will lose access to the platform.`, () =>
      runAction(
        () => setStatus(u.id, 'banned'),
        () => recordBanned(u, r),
        `${u.username} has been permanently banned`
      )
    );
  }

  function handleBanDelete() {
    const u = editUser;
    const r = getReason();
    if (!r) return;
    confirmAction('Ban & Delete User', `Permanently ban AND delete ${u.username}? This action is irreversible.`, () =>
      runAction(
        async () => {
          await setStatus(u.id, 'banned');
          // Record the deletion only after the server accepts it.
          await remove(u.id);
          recordBannedAndDeleted(u, r);
        },
        () => {},
        `${u.username} banned and deleted`
      )
    );
  }

  function handleUnban() {
    const u = editUser;
    runAction(
      () => setStatus(u.id, 'active'),
      () => recordUnbanned(u),
      `${u.username} has been unbanned`
    );
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

        <UserStats stats={countUsers(users)} />

        <UserFilters
          search={search}
          onSearchChange={setSearch}
          role={roleFilter}
          onRoleChange={setRoleFilter}
          status={statusFilter}
          onStatusChange={setStatusFilter}
        />

        {usersError && <p role="alert">{usersError}</p>}
        {usersStatus === 'loading' && !users.length ? (
          <p className="text-muted mt-2">Loading users…</p>
        ) : (
          <UserList
            users={filterUsers(users, me.userId, search, roleFilter, statusFilter)}
            viewerRole={me.role}
            onManage={openEditUser}
          />
        )}
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
