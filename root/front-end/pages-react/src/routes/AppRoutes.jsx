import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../pages/Landing';

// Publisher
import PublisherLayout from '../layouts/PublisherLayout';
import Dashboard from '../pages/publisher/Dashboard';
import PublishGame from '../pages/publisher/PublishGame';
import PublishTournament from '../pages/publisher/PublishTournament';
import MyGames from '../pages/publisher/MyGames';
import PublisherProfile from '../pages/publisher/Profile';
import Earnings from '../pages/publisher/Earnings';

// Player
import PlayerLayout from '../layouts/PlayerLayout';
import PlayerDashboard from '../pages/player/Dashboard';
import PlayerGames from '../pages/player/Games';
import PlayerTournaments from '../pages/player/Tournaments';
import CreateTournament from '../pages/player/CreateTournament';
import Community from '../pages/player/Community';
import Shop from '../pages/player/Shop';
import PlayerProfile from '../pages/player/Profile';
import MyTournaments from '../pages/player/MyTournaments';
import Leaderboard from '../pages/player/Leaderboard';
import MatchHistory from '../pages/player/MatchHistory';
import Notifications from '../pages/player/Notifications';

// Admin & Staff
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../pages/admin/Dashboard';
import Settings from '../pages/admin/Settings';
import Approvals from '../pages/admin/Approvals';
import Users from '../pages/admin/Users';
import GameReview from '../pages/admin/GameReview';
import Hub from '../pages/admin/Hub';
import StaffLayout from '../layouts/StaffLayout';
import StaffInbox from '../pages/staff/Inbox';

// Moderator
import ModeratorLayout from '../layouts/ModeratorLayout';
import ModeratorDashboard from '../pages/moderator/Dashboard';
import ModeratorReports from '../pages/moderator/Reports';
import ModeratorSessions from '../pages/moderator/Sessions';
import ModeratorBans from '../pages/moderator/Bans';

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
        <Route path="my-games" element={<MyGames />} />
        <Route path="mygames" element={<Navigate to="/publisher/my-games" replace />} />
        <Route path="profile" element={<PublisherProfile />} />
        <Route path="earnings" element={<Earnings />} />
      </Route>

      {/* Player routes */}
      <Route path="/player" element={<PlayerLayout />}>
        <Route index element={<Navigate to="/player/dashboard" replace />} />
        <Route path="dashboard" element={<PlayerDashboard />} />
        <Route path="games" element={<PlayerGames />} />
        <Route path="games/:gameId" element={<PlayerGames />} />
        <Route path="tournaments" element={<PlayerTournaments />} />
        <Route path="tournaments/:tournamentId" element={<PlayerTournaments />} />
        <Route path="my-tournaments" element={<MyTournaments />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="match-history" element={<MatchHistory />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="create-tournament" element={<CreateTournament />} />
        <Route path="community" element={<Community />} />
        <Route path="shop" element={<Shop />} />
        <Route path="profile" element={<PlayerProfile />} />
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

      {/* Moderator routes */}
      <Route path="/moderator" element={<ModeratorLayout />}>
        <Route index element={<Navigate to="/moderator/dashboard" replace />} />
        <Route path="dashboard" element={<ModeratorDashboard />} />
        <Route path="reports" element={<ModeratorReports />} />
        <Route path="sessions" element={<ModeratorSessions />} />
        <Route path="bans" element={<ModeratorBans />} />
      </Route>

      {/* Anything else goes to the landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
