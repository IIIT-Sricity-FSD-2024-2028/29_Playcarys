import React from 'react';

export function SuperuserStaffingCoverage(props) {
  const { staffing, loading, error } = props;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3>🧑‍💼 Staffing &amp; Coverage</h3>
        <span className="pf-note">mods scale with players · admins with games</span>
      </div>

      {loading && <div id="pf-staff" className="pf-loading">Loading…</div>}

      {!loading && error && (
        <div id="pf-staff" className="pf-loading">Could not load staffing figures.</div>
      )}

      {!loading && !error && staffing && (
        <div id="pf-staff">
          <div className="pf-ratios">
            <div className="pf-ratio">
              <div className="pf-ratio-big">
                1 : {staffing.players_per_moderator ?? '—'}
              </div>
              <div className="pf-cap">players per moderator</div>
              <div className="pf-sub">
                {staffing.moderators} moderator{staffing.moderators === 1 ? '' : 's'} ·{' '}
                {staffing.players} players
              </div>
            </div>

            <div className="pf-ratio">
              <div className="pf-ratio-big">
                1 : {staffing.games_per_admin ?? '—'}
              </div>
              <div className="pf-cap">games per admin</div>
              <div className="pf-sub">
                {staffing.admins} admin{staffing.admins === 1 ? '' : 's'} · {staffing.games} games
              </div>
            </div>

            <div className="pf-ratio">
              <div className="pf-ratio-big">
                1 : {staffing.games_per_publisher ?? '—'}
              </div>
              <div className="pf-cap">games per studio</div>
              <div className="pf-sub">{staffing.publishers} studios</div>
            </div>

            <div className="pf-ratio">
              <div className="pf-ratio-big">
                1 : {staffing.moderators_per_admin ?? '—'}
              </div>
              <div className="pf-cap">moderators per admin</div>
              <div className="pf-sub">escalation path</div>
            </div>
          </div>

          <div className="pf-rows" style={{ marginTop: '0.6rem' }}>
            <div className="pf-row">
              <span>Approved games</span>
              <b>{staffing.approved_games} of {staffing.games}</b>
            </div>
            <div className="pf-row">
              <span>Awaiting review</span>
              <b className={staffing.pending_games > 0 ? 'warn' : ''}>
                {String(staffing.pending_games)}
              </b>
            </div>
            <div className="pf-row">
              <span>Superusers</span>
              <b>{String(staffing.superusers)}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperuserStaffingCoverage;
