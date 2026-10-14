/*
 * Concepts used in this component:
 *  - Components, Props (user, reason, days, handlers), Forms (controlled reason and days boxes),
 *    Events (button clicks), Callbacks (one handler per action), prop drilling (from the page via the modal)
 *
 * "Administrative Actions" section of the user modal. Which buttons appear depends on the
 * user's role and status, exactly as in the old editUser().
 */
import React from 'react';

const RED = { borderColor: 'var(--accent-red)', color: 'var(--accent-red)' };
const GREEN = { borderColor: 'var(--accent-green)', color: 'var(--accent-green)' };

export function UserActionsPanel(props) {
  const {
    user, reason, onReasonChange, days, onDaysChange,
    onWarn, onSuspend, onRevoke, onBan, onBanDelete, onUnban
  } = props;

  return (
    <div id="actions-panel" style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)' }}>
      <h4 style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>Administrative Actions</h4>
      <div id="actions-container" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {user.role === 'admin' ? (
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--accent-yellow)', color: 'var(--accent-yellow)' }} onClick={onWarn}>⚠️ Warn Admin</button>
        ) : (
          <>
            <div style={{ width: '100%', marginBottom: '0.5rem' }}>
              <input
                type="text"
                id="action-reason"
                className="form-input"
                placeholder="Reason (Required for action, sent to user)"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
              />
            </div>

            {user.status === 'suspended' ? (
              <button className="btn btn-ghost btn-sm" style={{ ...GREEN, marginRight: '0.5rem' }} onClick={onRevoke}>▶️ Revoke Suspension</button>
            ) : (
              <>
                <input
                  type="number"
                  id="suspend-days"
                  className="form-input"
                  placeholder="Days"
                  value={days}
                  onChange={(e) => onDaysChange(e.target.value)}
                  style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: '32px' }}
                  min="1"
                />
                <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)', marginRight: '0.5rem' }} onClick={onSuspend}>⏸ Suspend</button>
              </>
            )}

            {user.role === 'player' ? (
              user.status !== 'banned' ? (
                <>
                  <button className="btn btn-ghost btn-sm" style={{ ...RED, marginRight: '0.5rem' }} onClick={onBan}>🚫 Ban Player</button>
                  <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--accent-red)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }} onClick={onBanDelete}>🚫 Ban + Delete</button>
                </>
              ) : (
                <button className="btn btn-ghost btn-sm" style={GREEN} onClick={onUnban}>✅ Unban Player</button>
              )
            ) : user.role === 'publisher' ? (
              user.status !== 'banned' ? (
                <button className="btn btn-ghost btn-sm" style={RED} onClick={onBan}>🚫 Ban Publisher</button>
              ) : (
                <button className="btn btn-ghost btn-sm" style={GREEN} onClick={onUnban}>✅ Unban Publisher</button>
              )
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default UserActionsPanel;
