import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublisherLayout from '../layouts/PublisherLayout';
import Dashboard from '../pages/publisher/Dashboard';
import PublishGame from '../pages/publisher/PublishGame';
import PublishTournament from '../pages/publisher/PublishTournament';
import MyGames from '../pages/publisher/MyGames';
import Profile from '../pages/publisher/Profile';
import Earnings from '../pages/publisher/Earnings';

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
        <Route path="my-games" element={<MyGames />} />
        <Route path="mygames" element={<Navigate to="/publisher/my-games" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="earnings" element={<Earnings />} />
      </Route>

      {/* Fallback to publisher dashboard */}
      <Route path="*" element={<Navigate to="/publisher/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
