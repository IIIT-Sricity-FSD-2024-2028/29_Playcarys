import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublisherLayout from '../layouts/PublisherLayout';
import Dashboard from '../pages/publisher/Dashboard';
import PublishGame from '../pages/publisher/PublishGame';
import PublishTournament from '../pages/publisher/PublishTournament';
import PlayerLayout from '../layouts/PlayerLayout';
import PlayerDashboard from '../pages/player/Dashboard';
import PlayerGames from '../pages/player/Games';
import PlayerTournaments from '../pages/player/Tournaments';
import CreateTournament from '../pages/player/CreateTournament';
import Community from '../pages/player/Community';
import Shop from '../pages/player/Shop';
import Profile from '../pages/player/Profile';
import Landing from '../pages/Landing';
import AdminLayout from '../layouts/AdminLayout';
import Settings from '../pages/admin/Settings';
import Approvals from '../pages/admin/Approvals';
import AdminDashboard from '../pages/admin/Dashboard';
import Users from '../pages/admin/Users';
import GameReview from '../pages/admin/GameReview';
import Hub from '../pages/admin/Hub';
import StaffLayout from '../layouts/StaffLayout';
import StaffInbox from '../pages/staff/Inbox';

export function AppRoutes() {
  return (
    <Routes>
      {/* Landing page + login. /index.html is the address the old pages send people to on logout. */}
      <Route path="/" element={<Landing />} />
      <Route path="/index.html" element={<Landing />} />

      {/* Publisher routes */}
      <Route path="/publisher" element={<PublisherLayout />}>
        <Route index element={<Navigate to="/publisher/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="publish" element={<PublishGame />} />
        <Route path="publish-tournament" element={<PublishTournament />} />
      </Route>

      {/* Player routes */}
      <Route path="/player" element={<PlayerLayout />}>
        <Route index element={<Navigate to="/player/dashboard" replace />} />
        <Route path="dashboard" element={<PlayerDashboard />} />
        <Route path="games" element={<PlayerGames />} />
        <Route path="tournaments" element={<PlayerTournaments />} />
        <Route path="create-tournament" element={<CreateTournament />} />
        <Route path="community" element={<Community />} />
        <Route path="shop" element={<Shop />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="users" element={<Users />} />
        <Route path="game-review" element={<GameReview />} />
        <Route path="hub" element={<Hub />} />
      </Route>

      {/* Staff routes (the inbox shared by admin, superuser, moderator and publisher) */}
      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<Navigate to="/staff/inbox" replace />} />
        <Route path="inbox" element={<StaffInbox />} />
      </Route>

      {/* Anything else goes to the landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
