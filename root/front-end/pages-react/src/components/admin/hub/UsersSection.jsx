/*
 * Concepts used in this component:
 *  - Components, Props (active, addAudit, onNavigate), State (filters, dialog, form, errors),
 *    Events (clicks, typing), Lists (user table rows), Hooks (useState, useContext),
 *    Forms (controlled search, filters and the add/edit form with validation), Context (AdminContext),
 *    Callbacks (confirmAction runs Delete only after "Confirm"; addAudit comes from the page)
 *
 * "User Management" section of the old hub.html: role numbers, a searchable table of players,
 * publishers and moderators, and the add / edit / delete actions.
 */
import React, { useState, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import KpiCard from './KpiCard';
import HubUserModal from './HubUserModal';
import StatusBadge from '../common/StatusBadge';
import { validateField } from '../../../services/adminValidation';
import { getPlatformStats, formatDate } from '../../../services/adminService';
import {
  listHubUsers,
  findUser,
  isUsernameTaken,
  isEmailTaken,
  saveHubUser,
  deleteHubUser
} from '../../../services/adminHubService';

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

  const s = getPlatformStats();
  const users = listHubUsers(search, roleFilter, statusFilter);
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
    toast.info(`Navigating to details for ${u.username}...`);
    setTimeout(() => onNavigate('users'), 1500);
  }

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

    saveHubUser(isEdit, editId, username, email, form.role, form.status, form.password, addAudit);
    toast.success(isEdit ? 'User updated' : 'User added');
    setModalOpen(false);
    refresh();
  }

  function handleDelete(id) {
    const u = findUser(id);
    if (!u) return;
    confirmAction('Delete User', `Permanently delete ${u.username}? Cannot be undone.`, () => {
      deleteHubUser(u, addAudit);
      toast.success('User deleted');
      refresh();
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
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(u.joinDate)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(u.lastSeen)}</td>
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
