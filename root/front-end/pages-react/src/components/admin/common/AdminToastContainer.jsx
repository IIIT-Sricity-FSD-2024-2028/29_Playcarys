/*
 * Concepts used in this component:
 *  - Components, Context (reads the toast list from AdminContext), Lists (one row per toast), Hooks (useContext)
 *
 * Same markup and CSS classes as the old Toast (#toast-container > .toast.toast-<type>).
 */
import React, { useContext } from 'react';
import AdminContext from '../../../context/AdminContext';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

export function AdminToastContainer() {
  const { toasts } = useContext(AdminContext);

  return (
    <div id="toast-container">
      {(toasts || []).map((t) => (
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

export default AdminToastContainer;
