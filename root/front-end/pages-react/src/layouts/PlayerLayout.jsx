import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PlayerNavbar from '../components/player/common/PlayerNavbar';
import { ChatProvider } from '../context/ChatContext';

export function PlayerLayout() {
  const location = useLocation();
  const activePage = location.pathname.split('/')[2] || 'dashboard';

  return (
    <ChatProvider>
      <div className="player-layout-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PlayerNavbar activePage={activePage} />
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </div>
    </ChatProvider>
  );
}

export default PlayerLayout;
