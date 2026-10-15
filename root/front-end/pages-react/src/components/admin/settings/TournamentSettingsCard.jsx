/*
 * Concepts used in this component:
 *  - Components, ToggleRow reused with no handler
 *
 * "🏆 Tournament Settings" card of the old settings.html. Both switches are drawn
 * "on" and have no click handler there, so they do nothing here either.
 */
import React from 'react';
import ToggleRow from '../common/ToggleRow';

export function TournamentSettingsCard() {
  return (
    <div className="card">
      <h3 style={{ marginBottom: '1.5rem' }}>🏆 Tournament Settings</h3>
      <ToggleRow
        id="toggle-autostart"
        title="Auto-start Tournaments"
        description="Automatically start when participant cap is reached"
        on={true}
      />
      <ToggleRow
        id="toggle-prizes"
        title="Prize Pool Enabled"
        description="Allow tournaments to have prize pools"
        on={true}
      />
    </div>
  );
}

export default TournamentSettingsCard;
