/*
 * Concepts used in this file:
 *  - Context (createContext + Provider shared by every admin page)
 *  - State (toast list, confirm dialog, refresh counter)
 *  - Hooks (useState, useRef)
 *  - Props (children)
 *  - Callbacks (confirmAction receives the function to run on "Confirm")
 *
 * What it replaces from the old admin pages: Toast.success/error/info/warning,
 * confirmAction(), and the habit of re-rendering by calling render() after
 * changing DB. Here, a page calls refresh() after it changes DB.
 */
import React, { createContext, useState, useRef } from 'react';

export const AdminContext = createContext({
  toast: { success: () => {}, error: () => {}, info: () => {}, warning: () => {} },
  confirmAction: () => {},
  refresh: () => {},
  version: 0
});

export function AdminProvider(props) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const nextToastId = useRef(1);

  // Same timing as the old Toast: visible 3.5s, then a 0.35s fade-out.
  function showToast(msg, type, duration) {
    const id = nextToastId.current;
    nextToastId.current = id + 1;
    const stay = duration || 3500;

    setToasts((list) => [...list, { id: id, msg: msg, type: type, leaving: false }]);
    setTimeout(() => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    }, stay);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, stay + 350);
  }

  const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
    warning: (msg) => showToast(msg, 'warning')
  };

  // confirmAction(title, message, onConfirm, type) — type is 'danger' (default) or 'info'.
  function confirmAction(title, msg, onConfirm, type) {
    setConfirmState({ title: title, msg: msg, onConfirm: onConfirm, type: type || 'danger' });
    setConfirmOpen(true);
  }

  function closeConfirm() {
    setConfirmOpen(false);
  }

  // DB lives outside React. After a page changes it, calling refresh() makes every
  // component that reads DB draw itself again.
  function refresh() {
    setVersion((v) => v + 1);
  }

  return (
    <AdminContext.Provider
      value={{
        toast: toast,
        toasts: toasts,
        confirmAction: confirmAction,
        confirmState: confirmState,
        confirmOpen: confirmOpen,
        closeConfirm: closeConfirm,
        refresh: refresh,
        version: version
      }}
    >
      {props.children}
    </AdminContext.Provider>
  );
}

export default AdminContext;
