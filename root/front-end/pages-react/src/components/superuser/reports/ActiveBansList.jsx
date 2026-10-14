import React from 'react';
import { formatDate } from '../../../services/superuserService';

export function ActiveBansList(props) {
  const { bans = [], onLiftBan } = props;

  const activeBans = bans.filter((b) => b.active);

  if (activeBans.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🔓</div>
        <h3>No active bans</h3>
        <p>All players are currently in good standing</p>
      </div>
    );
  }

  return (
    <div id="bans-list">
      {activeBans.map((b) => {
        const initials = (b.playerName || '??').slice(0, 2).toUpperCase();

        return (
          <div className="list-item" key={b.id}>
            <div className="avatar">{initials}</div>
            <div className="list-item-info">
              <div className="list-item-title">{b.playerName}</div>
              <div className="list-item-sub">
                <span>
                  Duration: <strong>{b.duration}</strong>
                </span>
                <span>· By: {b.bannedBy}</span>
                <span>· {formatDate(b.bannedDate)}</span>
                {b.expiresDate ? <span>· Expires: {formatDate(b.expiresDate)}</span> : null}
              </div>
              <div className="text-sm text-muted mt-1">{b.reason}</div>
            </div>
            <div className="list-item-actions">
              <button
                type="button"
                className="btn btn-green btn-sm"
                onClick={() => onLiftBan(b)}
              >
                🔓 Lift Ban
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ActiveBansList;
