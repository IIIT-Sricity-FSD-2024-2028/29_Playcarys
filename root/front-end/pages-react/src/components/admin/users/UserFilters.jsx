/*
 * Concepts used in this component:
 *  - Components, Props (values + change handlers), Forms (controlled search box and selects),
 *    Events (typing, choosing), Callbacks
 *
 * The search box and the two dropdowns above the user list.
 */
import React from 'react';

export function UserFilters(props) {
  const { search, onSearchChange, role, onRoleChange, status, onStatusChange } = props;

  return (
    <div className="filter-bar mt-3">
      <div className="search-wrap" style={{ maxWidth: '320px' }}>
        <span className="search-icon">🔍</span>
        <input
          className="form-input"
          id="search-input"
          placeholder="Search users..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <select
        className="form-select"
        id="role-filter"
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        style={{ width: '160px' }}
      >
        <option value="">All Roles</option>
        <option value="player">Players</option>
        <option value="publisher">Publishers</option>
        <option value="moderator">Moderators</option>
        <option value="admin">Admins</option>
      </select>
      <select
        className="form-select"
        id="status-filter"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{ width: '160px' }}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="banned">Banned</option>
      </select>
    </div>
  );
}

export default UserFilters;
