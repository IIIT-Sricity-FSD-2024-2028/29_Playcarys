// The admin pages and where each one lives. Every admin page is a React route.
import { useNavigate } from 'react-router-dom';

export const ADMIN_PAGES = {
  dashboard: { label: 'Dashboard', icon: '🏠', path: '/admin/dashboard' },
  hub: { label: 'Control Hub', icon: '⚡', path: '/admin/hub' },
  users: { label: 'Users', icon: '👥', path: '/admin/users' },
  approvals: { label: 'Approvals', icon: '✅', path: '/admin/approvals' },
  settings: { label: 'Settings', icon: '⚙️', path: '/admin/settings' },
  'game-review': { label: 'Review Build', icon: '🔍', path: '/admin/game-review' }
};

// The links shown in the navbar, in order.
export const NAV_IDS = ['dashboard', 'hub', 'users', 'approvals', 'settings'];

// useAdminNav() gives a function: go('users') or go('game-review', '?gameId=5').
// It replaces the old global navigate('users') used by every old admin page.
export function useAdminNav() {
  const navigate = useNavigate();

  return function go(pageId, query) {
    navigate(ADMIN_PAGES[pageId].path + (query || ''));
  };
}
