import React from 'react';
import { usePublisherAuth } from '../../hooks/usePublisherAuth';
import { usePublisherDashboardData } from '../../hooks/usePublisherDashboardData';
import PublisherDashboardHeader from '../../components/publisher/dashboard/PublisherDashboardHeader';
import PublisherStats from '../../components/publisher/dashboard/PublisherStats';
import PublisherGamesList from '../../components/publisher/dashboard/PublisherGamesList';
import PublisherEarningsSummary from '../../components/publisher/dashboard/PublisherEarningsSummary';
import PublisherTournaments from '../../components/publisher/dashboard/PublisherTournaments';
import PublisherSessionChart from '../../components/publisher/dashboard/PublisherSessionChart';
import PublisherViewsChart from '../../components/publisher/dashboard/PublisherViewsChart';
import PublisherLiveTelemetry from '../../components/publisher/dashboard/PublisherLiveTelemetry';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/publisher/dashboard.css';

export function Dashboard() {
  const {
    user,
    publisherId,
    isPublisher,
    authLoading
  } = usePublisherAuth();

  const {
    dashData,
    earningsData,
    earningsLoading,
    earningsError
  } = usePublisherDashboardData(
    publisherId,
    isPublisher
  );

  if (authLoading) {
    return <LoadingState message="Checking publisher credentials..." minHeight="60vh" />;
  }

  if (!isPublisher) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Publisher Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            You must be logged in with a publisher account to access this studio dashboard.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!dashData) {
    return <LoadingState message="Loading publisher studio..." minHeight="60vh" />;
  }

  return (
    <div className="page-content">
      {/* ── Header ───────────────────────────────── */}
      <PublisherDashboardHeader
        username={user?.username}
        pendingCount={dashData.pending.length}
        liveCount={dashData.liveCount}
        totalGames={dashData.myGames.length}
      />

      {/* ── KPI Strip ──────────────────────────── */}
      <PublisherStats
        totalGames={dashData.myGames.length}
        approvedCount={dashData.approved.length}
        pendingCount={dashData.pending.length}
        totalViews={dashData.totalViews}
        totalSessions={dashData.totalSessions}
        liveCount={dashData.liveCount}
        revenuePcp={dashData.revenuePcp}
        earningsData={earningsData}
        earningsLoading={earningsLoading}
      />

      {/* ── Working Area ─────────────────────────── */}
      <div className="pub-grid">
        <PublisherGamesList games={dashData.myGames} />

        <aside className="pub-side">
          <PublisherEarningsSummary
            earningsData={earningsData}
            loading={earningsLoading}
            error={earningsError}
          />

          <PublisherTournaments tournaments={dashData.myTournaments} />
        </aside>
      </div>

      {/* ── Analytics ────────────────────────────── */}
      <div className="pub-charts">
        <PublisherSessionChart sessionsByDay={dashData.sessionsByDay} />
        <PublisherViewsChart games={dashData.myGames} />
      </div>

      {/* ── Live Telemetry Panel ─────────────────── */}
      <PublisherLiveTelemetry hasHillClimbing={dashData.hasHillClimbing} />
    </div>
  );
}

export default Dashboard;
