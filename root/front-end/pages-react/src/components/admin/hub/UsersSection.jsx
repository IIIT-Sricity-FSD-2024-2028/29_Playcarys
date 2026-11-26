/*
 * Concepts used in this component:
 *  - Components, Props (active, addAudit, onNavigate), State (filters, dialog, form, errors),
 *    Events (clicks, typing), Lists (user table rows), Hooks (useState, useContext, useEffect),
 *    Forms (controlled search, filters and the add/edit form with validation), Context (AdminContext),
 *    Callbacks (confirmAction runs Delete only after "Confirm"; addAudit comes from the page)
 *
 * "User Management" section of the old hub.html: role numbers, a searchable table of players,
 * publishers and moderators, and the add / edit / delete actions.
 */
import React, { useState, useContext, useEffect } from 'react';
import AdminContext from '../../../context/AdminContext';
import KpiCard from './KpiCard';
import HubUserModal from './HubUserModal';
import StatusBadge from '../common/StatusBadge';
import { validateField } from '../../../services/adminValidation';
import { formatDate } from '../../../services/adminService';
import { useUsers } from '../../../features/users/useUsers';
import { filterUsers, isUsernameTaken, isEmailTakenForRole, countUsers, recordSuspended, recordSuspensionRevoked, recordBanned, recordUnbanned } from '../../../services/adminUserService';

const EMPTY_FORM = { username: '', email: '', role: 'player', status: 'active', password: '' };
const NO_ERRORS = { username: '', email: '', password: '' };

export function UsersSection(props) {
  const { active, addAudit, onNavigate } = props;
  const { toast, confirmAction, refresh } = useContext(AdminContext);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(''); // '' means "Add User"
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState(NO_ERRORS);

  const { users: allUsers, status, error, load, create, update, setStatus, remove } = useUsers();
  useEffect(() => { load().catch(err => toast.error(String(err))); }, [load]);
  const s = { ...countUsers(allUsers), admins: allUsers.filter(u => u.role === 'admin').length };
  const users = filterUsers(allUsers.filter(u => ['player', 'publisher', 'moderator'].includes(u.role)), null, search, roleFilter, statusFilter);
  const findUser = id => allUsers.find(u => String(u.id) === String(id));
  const isEdit = !!editId;

  function openAddUser() {
    setEditId('');
    setForm(EMPTY_FORM);
    setErrors(NO_ERRORS);
    setModalOpen(true);
  }

  function openEditUser(id) {
    const u = findUser(id);
    if (!u) return;
    setEditId(u.id);
    setForm({ username: u.username, email: u.email, role: u.role, status: u.status, password: '' });
    setErrors(NO_ERRORS);
    setModalOpen(true);
  }

  function handleFieldChange(field, value) {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  }

  // "Details" only announces where it is going, then opens the Users page.
  function viewUserDetails(id) {
    const u = findUser(id);
    if (!u) return;
    toast.info(`Navigating to details for ${u.username}...`);
    setTimeout(() => onNavigate('users'), 1500);
  }

  async function handleSave() {
    const usernameMsg = validateField(form.username, [{ type: 'required' }, { type: 'minLen', n: 3 }, { type: 'maxLen', n: 20 }]);
    const emailMsg = validateField(form.email, [{ type: 'required' }, { type: 'email' }]);
    const passwordMsg = isEdit ? '' : validateField(form.password, [{ type: 'required' }, { type: 'password' }]);

    const username = form.username.trim();
    const email = form.email.trim();

    let dupUserMsg = '';
    let dupEmailMsg = '';
    if (!usernameMsg && isUsernameTaken(allUsers, username, editId)) {
      dupUserMsg = 'Username already taken';
    }
    if (!emailMsg && isEmailTakenForRole(allUsers, email, form.role, editId)) {
      dupEmailMsg = 'Email already registered';
    }

    const nextErrors = {
      username: usernameMsg || dupUserMsg,
      email: emailMsg || dupEmailMsg,
      password: passwordMsg
    };
    setErrors(nextErrors);
    if (nextErrors.username || nextErrors.email || nextErrors.password) return;

    try {
      const previous = isEdit ? findUser(editId) : null;
      const saved = isEdit
        ? await update(editId, { username, email })
        : await create({ username, email, role: form.role, password: form.password });
      if (form.status !== (previous?.status || 'active')) {
        const changed = await setStatus(saved.id, form.status);
        if (form.status === 'suspended') recordSuspended(changed, 'unspecified', 'Hub status change');
        else if (form.status === 'banned') recordBanned(changed, 'Hub status change');
        else if (previous?.status === 'banned') recordUnbanned(changed);
        else if (previous?.status === 'suspended') recordSuspensionRevoked(changed, 'Hub status change');
      }
      addAudit('user', isEdit ? `User ${username} edited` : `New user added: ${username}`, `Role: ${form.role}, Status: ${form.status}`);
      toast.success(isEdit ? 'User updated' : 'User added');
      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(String(err?.message || err || 'Failed to save user'));
    }
  }

  function handleDelete(id) {
    const u = findUser(id);
    if (!u) return;
    confirmAction('Delete User', `Permanently delete ${u.username}? Cannot be undone.`, async () => {
      try {
        await remove(u.id);
        addAudit('user', `User deleted: ${u.username}`, 'Deleted by admin');
        toast.success('User deleted');
        refresh();
      } catch (err) {
        toast.error(String(err?.message || err || 'Failed to delete user'));
      }
    });
  }

  return (
    <>
      <div className={'hub-section' + (active ? ' active' : '')} id="sec-users">
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>User Management</h2>
          <button className="btn btn-primary btn-sm" onClick={openAddUser}>+ Add User</button>
        </div>

        <div className="kpi-row mb-2">
          <KpiCard color="var(--accent-cyan)" label="Players" value={s.players} icon="🎮" />
          <KpiCard color="var(--accent-green)" label="Publishers" value={s.publishers} icon="⬆️" />
          <KpiCard color="var(--accent-purple)" label="Moderators" value={s.moderators} icon="🛡️" />
          <KpiCard color="var(--accent-yellow)" label="Admins" value={s.admins} icon="👑" />
        </div>

        {status === "loading" && <p>Loading users…</p>}
        {error && <p role="alert">{error}</p>}
        <div className="user-table-wrap">
          <div className="user-table-head">
            <div className="search-wrap" style={{ maxWidth: '280px' }}>
              <span className="search-icon">🔍</span>
              <input
                className="form-input"
                id="u-search"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className="form-select" id="u-role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ width: '150px' }}>
                <option value="">All Roles</option>
                <option value="player">Players</option>
                <option value="publisher">Publishers</option>
                <option value="moderator">Moderators</option>
              </select>
              <select className="form-select" id="u-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '130px' }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          </div>
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
                {users.length ? users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="avatar avatar-sm">{u.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.username}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge status={u.role} /></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(u.joinDate || u.created_at)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(u.lastSeen || u.updated_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => viewUserDetails(u.id)}>👁 Details</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditUser(u.id)}>✏️ Edit</button>
                        {u.role === 'player' ? <button className="btn btn-red btn-sm" onClick={() => handleDelete(u.id)}>🗑 Delete</button> : null}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <HubUserModal
        open={modalOpen}
        isEdit={isEdit}
        form={form}
        errors={errors}
        onFieldChange={handleFieldChange}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}

export default UsersSection;
