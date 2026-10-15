/*
 * Concepts used in this component:
 *  - Components, Props (values + handlers from the page), Events (typing, toggles),
 *    Forms (controlled input with an error message), prop drilling (onToggle goes to ToggleRow),
 *    Callbacks (onNameChange / onToggle)
 *
 * "🌐 Platform Settings" card of the old settings.html.
 */
import React from 'react';
import ToggleRow from '../common/ToggleRow';

export function PlatformSettingsCard(props) {
  const { settings, platformName, onNameChange, nameError, nameLocked, onToggle } = props;

  // Only a superuser may rename the platform. The field stays visible but disabled,
  // so an admin can see the setting and why it is not theirs.
  const inputStyle = nameLocked
    ? { maxWidth: '340px', opacity: '.55', cursor: 'not-allowed' }
    : { maxWidth: '340px' };

  return (
    <div className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>🌐 Platform Settings <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'Inter' }}>General platform configuration</span></h3>
      <div className="form-group mb-2">
        <label className="form-label">Platform Name</label>
        <input
          className={'form-input' + (nameError ? ' error' : '')}
          id="platform-name"
          value={platformName}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={nameLocked}
          title={nameLocked ? 'Only a superuser can rename the platform' : undefined}
          style={inputStyle}
        />
        <span className="form-hint" id="platform-name-hint">
          {nameLocked
            ? 'Superuser only — this name appears platform-wide, so renaming it is not an admin action.'
            : 'The name displayed across the platform'}
        </span>
        <span className={'form-error' + (nameError ? ' show' : '')}>{nameError}</span>
      </div>
      <ToggleRow
        id="toggle-maintenance"
        title="Maintenance Mode"
        description="Temporarily disable platform access"
        on={settings.maintenanceMode}
        onChange={(v) => onToggle('maintenanceMode', v)}
      />
      <ToggleRow
        id="toggle-registration"
        title="Registration"
        description="Allow new user registrations"
        on={settings.registrationOpen}
        onChange={(v) => onToggle('registrationOpen', v)}
      />
    </div>
  );
}

export default PlatformSettingsCard;
