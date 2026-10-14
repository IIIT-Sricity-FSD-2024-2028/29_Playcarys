import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublisherLayout from '../layouts/PublisherLayout';
import Dashboard from '../pages/publisher/Dashboard';
import PublishGame from '../pages/publisher/PublishGame';
import PublishTournament from '../pages/publisher/PublishTournament';

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

      {/* Fallback to publisher dashboard */}
      <Route path="*" element={<Navigate to="/publisher/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
