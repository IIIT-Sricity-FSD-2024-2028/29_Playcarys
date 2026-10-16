/*
 * Concepts used in this component:
 *  - Components, Props (status)
 *
 * Replaces the old badgeHTML(status) helper: a coloured pill such as "Pending" or "Banned".
 */
import React from 'react';
import { capitalize } from '../../../services/adminService';

const BADGE_CLASS = {
  pending: 'badge-pending',
  'under-review': 'badge-review',
  resolved: 'badge-resolved',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  banned: 'badge-banned',
  active: 'badge-active',
  waiting: 'badge-waiting',
  'in-progress': 'badge-progress',
  upcoming: 'badge-upcoming',
  completed: 'badge-approved',
  player: 'badge-player',
  publisher: 'badge-publisher',
  moderator: 'badge-moderator',
  admin: 'badge-admin',
  superuser: 'badge-superuser',
  enabled: 'badge-enabled',
  disabled: 'badge-disabled',
  blacklisted: 'badge-disabled',
  suspended: 'badge-pending'
};

export function StatusBadge(props) {
  const { status } = props;

  const cls = BADGE_CLASS[status] || 'badge-active';
  let label = capitalize(status);
  if (status === 'in-progress') label = 'In Progress';
  if (status === 'under-review') label = 'Under Review';

  return <span className={'badge ' + cls}>{label}</span>;
}

export default StatusBadge;
