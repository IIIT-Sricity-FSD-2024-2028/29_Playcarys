import React from 'react';
import { getPlayers } from '../../../services/moderatorService';

function getStatusBadgeClass(status) {
  switch (status) {
    case 'in-progress':
      return 'badge-progress';
    case 'completed':
      return 'badge-approved';
    default:
      return 'badge-active';
  }
}

function getStatusLabel(status) {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Match';
}

function getUserAvatar(u) {
  if (!u) return '👤';
  if (u.avatar) return u.avatar;
  const name = u.user_name || u.username || 'U';
  return name.slice(0, 2).toUpperCase();
}

export function SessionListItem({ match, matchResults = [], users = [], onMonitor }) {
  const plist = getPlayers(match, matchResults);
  const sid = String(match.match_id != null ? match.match_id : match.id);

  return (
    <div className="list-item match-list-item">
      <div className="list-item-info match-item-info">
        <div className="match-item-header">
          <span className="list-item-title match-item-title">{match.game || 'Game'}</span>
          <span className={`badge ${getStatusBadgeClass(match.status)}`}>
            {getStatusLabel(match.status)}
          </span>
          <span className="badge badge-review" style={{ fontSize: '0.68rem' }}>
            {match.mode || 'casual'}
          </span>
        </div>

        <div className="list-item-sub match-item-meta mt-1">
          <span>
            👥 {plist.length} player{plist.length === 1 ? '' : 's'}
          </span>
          <span>⏱ {match.duration || 0}s</span>
          <span>#{sid}</span>
        </div>

        <div className="list-item-sub match-item-avatars">
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {plist.map((pid) => {
              const u = users.find(
                (usr) => String(usr.user_id) === String(pid) || String(usr.id) === String(pid)
              );
              if (!u) return null;
              return (
                <div
                  key={pid}
                  className="avatar avatar-sm"
                  title={u.user_name || u.username}
                >
                  {getUserAvatar(u)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => onMonitor(match)}
      >
        👁 Monitor
      </button>
    </div>
  );
}

export default SessionListItem;
