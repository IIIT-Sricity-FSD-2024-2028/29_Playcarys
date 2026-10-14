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

      {/* Fallback to publisher dashboard */}
      <Route path="*" element={<Navigate to="/publisher/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
