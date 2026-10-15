/*
 * Concepts used in this component:
 *  - Components, Props (the toast list), Lists (one box per toast)
 *
 * Same markup and classes as the old Toast (#toast-container > .toast.toast-<type>).
 */
import React from 'react';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

export function LandingToasts(props) {
  const { toasts } = props;

  return (
    <div id="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          style={t.leaving ? { animation: 'fadeOut 0.35s ease forwards' } : undefined}
        >
          <span>{ICONS[t.type] || 'ℹ️'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export default LandingToasts;
