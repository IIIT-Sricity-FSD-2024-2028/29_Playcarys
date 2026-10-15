import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PlayerNavbar from '../components/player/common/PlayerNavbar';
import { ChatProvider } from '../context/ChatContext';

export function PlayerLayout() {
  const location = useLocation();

  let activePage = 'dashboard';
  if (location.pathname.includes('/player/games')) {
    activePage = 'games';
  } else if (location.pathname.includes('/player/tournaments')) {
    activePage = 'tournaments';
  } else if (location.pathname.includes('/player/community')) {
    activePage = 'community';
  } else if (location.pathname.includes('/player/shop')) {
    activePage = 'shop';
  } else if (location.pathname.includes('/player/profile')) {
    activePage = 'profile';
  }

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
