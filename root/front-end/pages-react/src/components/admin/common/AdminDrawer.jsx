/*
 * Concepts used in this component:
 *  - Components, Props (open, onClose, links, activePage, onNavigate, session, unreadLabel, onChanged),
 *    Events (clicks), Lists (page links), Hooks (useEffect), Callbacks (onNavigate / onClose /
 *    onChanged from the navbar), prop drilling (session and onChanged go on to the two sections)
 *
 * The ☰ drawer (injectSideDrawer in js/utils.js), as an admin sees it: the page links (shown on
 * phones, where the top bar is hidden), then Notifications, then staff Messages. The "Friends"
 * section of the old drawer is for players only, so it is not here.
 */
import React, { useEffect } from 'react';
import NotificationsSection from '../drawer/NotificationsSection';
import MessagesSection from '../drawer/MessagesSection';

export function AdminDrawer(props) {
  const { open, onClose, links, activePage, onNavigate, session, unreadLabel, onChanged } = props;

  // The old drawer added "drawer-open" to <body> while it was showing.
  useEffect(() => {
    document.body.classList.toggle('drawer-open', open);
    return () => document.body.classList.remove('drawer-open');
  }, [open]);

  return (
    <>
      <div
        className={'drawer-overlay' + (open ? ' open' : '')}
        id="drawer-overlay"
        onClick={onClose}
      ></div>
      <div className={'drawer-panel' + (open ? ' open' : '')} id="drawer-panel">
        <div className="drawer-header">
          <h3>🎮 PlayCarys</h3>
          <div className="drawer-close" onClick={onClose}>✕</div>
        </div>
        <div className="drawer-body">
          <div className="drawer-nav-mobile">
            {links.map((link) => (
              <div
                key={link.id}
                className={'nav-link' + (activePage === link.id ? ' active' : '')}
                data-page={link.id}
                onClick={() => {
                  onClose();
                  onNavigate(link);
                }}
              >
                {link.icon} {link.label}
              </div>
            ))}
          </div>

          <NotificationsSection session={session} unreadLabel={unreadLabel} onChanged={onChanged} />
          <MessagesSection session={session} onChanged={onChanged} />
        </div>
      </div>
    </>
  );
}

export default AdminDrawer;
