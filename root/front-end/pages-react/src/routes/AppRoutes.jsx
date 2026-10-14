import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublisherLayout from '../layouts/PublisherLayout';
import Dashboard from '../pages/publisher/Dashboard';
import PublishGame from '../pages/publisher/PublishGame';
import PublishTournament from '../pages/publisher/PublishTournament';
import SuperuserLayout from '../layouts/SuperuserLayout';
import SuperuserDashboard from '../pages/superuser/Dashboard';
import SuperuserHub from '../pages/superuser/Hub';
import SuperuserUsers from '../pages/superuser/Users';
import SuperuserAdmins from '../pages/superuser/Admins';
import SuperuserGames from '../pages/superuser/Games';
import SuperuserSettings from '../pages/superuser/Settings';
import SuperuserReports from '../pages/superuser/Reports';
import ModeratorLayout from '../layouts/ModeratorLayout';
import ModeratorDashboard from '../pages/moderator/Dashboard';
import ModeratorReports from '../pages/moderator/Reports';
import ModeratorSessions from '../pages/moderator/Sessions';
import ModeratorBans from '../pages/moderator/Bans';
import NotFound from '../pages/common/NotFound';

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect to Publisher Dashboard */}
      <Route path="/" element={<Navigate to="/publisher/dashboard" replace />} />

      {/* Publisher routes */}
      <Route path="/publisher" element={<PublisherLayout />}>
        <Route index element={<Navigate to="/publisher/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="publish" element={<PublishGame />} />
        <Route path="publish-tournament" element={<PublishTournament />} />
      </Route>

      {/* Superuser routes */}
      <Route path="/superuser" element={<SuperuserLayout />}>
        <Route index element={<Navigate to="/superuser/dashboard" replace />} />
        <Route path="dashboard" element={<SuperuserDashboard />} />
        <Route path="hub" element={<SuperuserHub />} />
        <Route path="users" element={<SuperuserUsers />} />
        <Route path="admins" element={<SuperuserAdmins />} />
        <Route path="games" element={<SuperuserGames />} />
        <Route path="reports" element={<SuperuserReports />} />
        <Route path="settings" element={<SuperuserSettings />} />
      </Route>

      {/* Moderator routes */}
      <Route path="/moderator" element={<ModeratorLayout />}>
        <Route index element={<Navigate to="/moderator/dashboard" replace />} />
        <Route path="dashboard" element={<ModeratorDashboard />} />
        <Route path="reports" element={<ModeratorReports />} />
        <Route path="sessions" element={<ModeratorSessions />} />
        <Route path="bans" element={<ModeratorBans />} />
      </Route>

      {/* 404 Not Found for unmatched routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
