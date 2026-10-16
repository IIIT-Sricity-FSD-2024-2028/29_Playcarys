/*
 * Concepts used in this component:
 *  - Components, Context (AdminContext holds the dialog), State (open/closed comes from context),
 *    Events (button + overlay clicks), Hooks (useContext, useEffect), Callbacks (runs onConfirm)
 *
 * Same markup as the old #confirm-modal built by insertConfirmModal() in js/utils.js.
 */
import React, { useContext, useEffect } from 'react';
import AdminContext from '../../../context/AdminContext';

export function AdminConfirmModal() {
  const { confirmState, confirmOpen, closeConfirm } = useContext(AdminContext);

  // The old Modal.open() stopped the page behind the dialog from scrolling.
  useEffect(() => {
    if (!confirmOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [confirmOpen]);

  const state = confirmState || { title: 'Confirm Action', msg: '', type: 'danger' };
  const isDanger = state.type === 'danger';

  function handleConfirm() {
    closeConfirm();
    if (state.onConfirm) state.onConfirm();
  }

  // Clicking the dark area (not the dialog itself) closes it.
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) closeConfirm();
  }

  return (
    <div
      className={'modal-overlay' + (confirmOpen ? ' show' : '')}
      id="confirm-modal"
      onClick={handleOverlayClick}
    >
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title" id="confirm-title">{state.title}</h3>
          <span className="modal-close" onClick={closeConfirm}>✕</span>
        </div>
        <p id="confirm-msg" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {state.msg}
        </p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={closeConfirm}>Cancel</button>
          <button
            className={isDanger ? 'btn btn-red' : 'btn btn-green'}
            id="confirm-btn"
            onClick={handleConfirm}
          >
            {isDanger ? 'Confirm' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminConfirmModal;
