import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../pages/Landing';
import LoadingState from '../components/common/LoadingState';

// Layouts (can be lazy or standard, keeping layouts fast)
import PublisherLayout from '../layouts/PublisherLayout';
import PlayerLayout from '../layouts/PlayerLayout';
import AdminLayout from '../layouts/AdminLayout';
import StaffLayout from '../layouts/StaffLayout';
import ModeratorLayout from '../layouts/ModeratorLayout';
import SuperuserLayout from '../layouts/SuperuserLayout';

// Common
const NotFound = lazy(() => import('../pages/common/NotFound'));

// Publisher Pages (Lazy)
const Dashboard = lazy(() => import('../pages/publisher/Dashboard'));
const PublishGame = lazy(() => import('../pages/publisher/PublishGame'));
const PublishTournament = lazy(() => import('../pages/publisher/PublishTournament'));
const MyGames = lazy(() => import('../pages/publisher/MyGames'));
const PublisherProfile = lazy(() => import('../pages/publisher/Profile'));
const Earnings = lazy(() => import('../pages/publisher/Earnings'));
const PublisherFinance = lazy(() => import('../pages/publisher/Finance'));
const PublisherOnboardingRegister = lazy(() => import('../pages/publisher/OnboardingRegister'));

// Player Pages (Lazy)
const PlayerDashboard = lazy(() => import('../pages/player/Dashboard'));
const PlayerGames = lazy(() => import('../pages/player/Games'));
const PlayerTournaments = lazy(() => import('../pages/player/Tournaments'));
const CreateTournament = lazy(() => import('../pages/player/CreateTournament'));
const Community = lazy(() => import('../pages/player/Community'));
const Shop = lazy(() => import('../pages/player/Shop'));
const PlayerProfile = lazy(() => import('../pages/player/Profile'));
const MyTournaments = lazy(() => import('../pages/player/MyTournaments'));
const Leaderboard = lazy(() => import('../pages/player/Leaderboard'));
const MatchHistory = lazy(() => import('../pages/player/MatchHistory'));
const Notifications = lazy(() => import('../pages/player/Notifications'));

// Admin & Staff Pages (Lazy)
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const Settings = lazy(() => import('../pages/admin/Settings'));
const Approvals = lazy(() => import('../pages/admin/Approvals'));
const Users = lazy(() => import('../pages/admin/Users'));
const GameReview = lazy(() => import('../pages/admin/GameReview'));
const Hub = lazy(() => import('../pages/admin/Hub'));
const StaffInbox = lazy(() => import('../pages/staff/Inbox'));

// Moderator Pages (Lazy)
const ModeratorDashboard = lazy(() => import('../pages/moderator/Dashboard'));
const ModeratorReports = lazy(() => import('../pages/moderator/Reports'));
const ModeratorSessions = lazy(() => import('../pages/moderator/Sessions'));
const ModeratorBans = lazy(() => import('../pages/moderator/Bans'));

// Superuser Pages (Lazy)
const SuperuserDashboard = lazy(() => import('../pages/superuser/Dashboard'));
const SuperuserHub = lazy(() => import('../pages/superuser/Hub'));
const SuperuserUsers = lazy(() => import('../pages/superuser/Users'));
const SuperuserAdmins = lazy(() => import('../pages/superuser/Admins'));
const SuperuserGames = lazy(() => import('../pages/superuser/Games'));
const SuperuserReports = lazy(() => import('../pages/superuser/Reports'));
const SuperuserSettings = lazy(() => import('../pages/superuser/Settings'));

function RouteSuspense({ children }) {
  return (
    <Suspense fallback={<LoadingState message="Loading view..." minHeight="50vh" />}>
      {children}
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Landing page + login. /index.html is the address the old pages send people to on logout. */}
      <Route path="/" element={<Landing />} />
      <Route path="/index.html" element={<Landing />} />

      {/* Publisher routes */}
      <Route path="/publisher" element={<PublisherLayout />}>
        <Route index element={<Navigate to="/publisher/dashboard" replace />} />
        <Route path="dashboard" element={<RouteSuspense><Dashboard /></RouteSuspense>} />
        <Route path="publish" element={<RouteSuspense><PublishGame /></RouteSuspense>} />
        <Route path="publish-tournament" element={<RouteSuspense><PublishTournament /></RouteSuspense>} />
        <Route path="my-games" element={<RouteSuspense><MyGames /></RouteSuspense>} />
        <Route path="mygames" element={<Navigate to="/publisher/my-games" replace />} />
        <Route path="profile" element={<RouteSuspense><PublisherProfile /></RouteSuspense>} />
        <Route path="earnings" element={<RouteSuspense><Earnings /></RouteSuspense>} />
        <Route path="finance" element={<RouteSuspense><PublisherFinance /></RouteSuspense>} />
        <Route path="onboarding" element={<RouteSuspense><PublisherOnboardingRegister /></RouteSuspense>} />
        <Route path="register" element={<RouteSuspense><PublisherOnboardingRegister /></RouteSuspense>} />
      </Route>

      {/* Player routes */}
      <Route path="/player" element={<PlayerLayout />}>
        <Route index element={<Navigate to="/player/dashboard" replace />} />
        <Route path="dashboard" element={<RouteSuspense><PlayerDashboard /></RouteSuspense>} />
        <Route path="games" element={<RouteSuspense><PlayerGames /></RouteSuspense>} />
        <Route path="games/:gameId" element={<RouteSuspense><PlayerGames /></RouteSuspense>} />
        <Route path="tournaments" element={<RouteSuspense><PlayerTournaments /></RouteSuspense>} />
        <Route path="tournaments/:tournamentId" element={<RouteSuspense><PlayerTournaments /></RouteSuspense>} />
        <Route path="my-tournaments" element={<RouteSuspense><MyTournaments /></RouteSuspense>} />
        <Route path="leaderboard" element={<RouteSuspense><Leaderboard /></RouteSuspense>} />
        <Route path="match-history" element={<RouteSuspense><MatchHistory /></RouteSuspense>} />
        <Route path="notifications" element={<RouteSuspense><Notifications /></RouteSuspense>} />
        <Route path="create-tournament" element={<RouteSuspense><CreateTournament /></RouteSuspense>} />
        <Route path="community" element={<RouteSuspense><Community /></RouteSuspense>} />
        <Route path="community/:groupId" element={<RouteSuspense><Community /></RouteSuspense>} />
        <Route path="community/:groupId/:groupTab" element={<RouteSuspense><Community /></RouteSuspense>} />
        <Route path="shop" element={<RouteSuspense><Shop /></RouteSuspense>} />
        <Route path="profile" element={<RouteSuspense><PlayerProfile /></RouteSuspense>} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<RouteSuspense><AdminDashboard /></RouteSuspense>} />
        <Route path="settings" element={<RouteSuspense><Settings /></RouteSuspense>} />
        <Route path="approvals" element={<RouteSuspense><Approvals /></RouteSuspense>} />
        <Route path="users" element={<RouteSuspense><Users /></RouteSuspense>} />
        <Route path="game-review" element={<RouteSuspense><GameReview /></RouteSuspense>} />
        <Route path="hub" element={<RouteSuspense><Hub /></RouteSuspense>} />
      </Route>

      {/* Staff routes */}
      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<Navigate to="/staff/inbox" replace />} />
        <Route path="inbox" element={<RouteSuspense><StaffInbox /></RouteSuspense>} />
      </Route>

      {/* Superuser routes */}
      <Route path="/superuser" element={<SuperuserLayout />}>
        <Route index element={<Navigate to="/superuser/dashboard" replace />} />
        <Route path="dashboard" element={<RouteSuspense><SuperuserDashboard /></RouteSuspense>} />
        <Route path="hub" element={<RouteSuspense><SuperuserHub /></RouteSuspense>} />
        <Route path="users" element={<RouteSuspense><SuperuserUsers /></RouteSuspense>} />
        <Route path="admins" element={<RouteSuspense><SuperuserAdmins /></RouteSuspense>} />
        <Route path="games" element={<RouteSuspense><SuperuserGames /></RouteSuspense>} />
        <Route path="reports" element={<RouteSuspense><SuperuserReports /></RouteSuspense>} />
        <Route path="settings" element={<RouteSuspense><SuperuserSettings /></RouteSuspense>} />
      </Route>

      {/* Moderator routes */}
      <Route path="/moderator" element={<ModeratorLayout />}>
        <Route index element={<Navigate to="/moderator/dashboard" replace />} />
        <Route path="dashboard" element={<RouteSuspense><ModeratorDashboard /></RouteSuspense>} />
        <Route path="reports" element={<RouteSuspense><ModeratorReports /></RouteSuspense>} />
        <Route path="sessions" element={<RouteSuspense><ModeratorSessions /></RouteSuspense>} />
        <Route path="bans" element={<RouteSuspense><ModeratorBans /></RouteSuspense>} />
        <Route path="bans/:playerId" element={<RouteSuspense><ModeratorBans /></RouteSuspense>} />
      </Route>

      {/* 404 Not Found for unmatched routes */}
      <Route path="*" element={<RouteSuspense><NotFound /></RouteSuspense>} />
    </Routes>
  );
}

export default AppRoutes;
