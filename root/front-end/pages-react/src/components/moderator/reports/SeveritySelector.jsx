import React from 'react';

const SEVERITY_OPTIONS = [
  { id: 'low', emoji: '🟡', label: 'Low', desc: 'First offence', activeClass: 'active-low' },
  { id: 'medium', emoji: '🟠', label: 'Medium', desc: 'Repeated', activeClass: 'active-medium' },
  { id: 'high', emoji: '🔴', label: 'High', desc: 'Serious', activeClass: 'active-high' },
  { id: 'critical', emoji: '🚨', label: 'Critical', desc: 'Immediate', activeClass: 'active-critical' }
];

export function SeveritySelector({ value = 'medium', onChange }) {
  return (
    <div className="form-group" style={{ marginTop: '0.75rem' }}>
      <label className="form-label">Severity Level</label>
      <div className="sev-grid" id="sev-btns">
        {SEVERITY_OPTIONS.map((opt) => {
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={`sev-btn ${isActive ? opt.activeClass : ''}`}
              data-val={opt.id}
              onClick={() => onChange(opt.id)}
            >
              <span>{opt.emoji}</span>
              <span>
                {opt.label}
                <br />
                <span style={{ fontSize: '0.64rem', opacity: isActive ? 0.8 : 0.6 }}>
                  {opt.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SeveritySelector;
