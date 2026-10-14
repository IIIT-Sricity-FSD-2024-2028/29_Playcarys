import React from 'react';

export function ToggleSwitch({ title, description, checked, onChange }) {
  return (
    <div className="toggle-wrap">
      <div className="toggle-info">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div
        className={`toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      />
    </div>
  );
}

export default ToggleSwitch;
