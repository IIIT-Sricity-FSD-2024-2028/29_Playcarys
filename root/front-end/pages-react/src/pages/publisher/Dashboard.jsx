import React, { useState, useMemo } from 'react';
import { usePublisherAuth } from '../../hooks/usePublisherAuth';
import { usePublisherDashboardData } from '../../hooks/usePublisherDashboardData';
import PublisherDashboardHeader from '../../components/publisher/dashboard/PublisherDashboardHeader';
import PublisherStats from '../../components/publisher/dashboard/PublisherStats';
import PublisherGamesList from '../../components/publisher/dashboard/PublisherGamesList';
import PublisherEarningsSummary from '../../components/publisher/dashboard/PublisherEarningsSummary';
import PublisherTournaments from '../../components/publisher/dashboard/PublisherTournaments';
import PublisherSessionChart from '../../components/publisher/dashboard/PublisherSessionChart';
import PublisherViewsChart from '../../components/publisher/dashboard/PublisherViewsChart';
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

  const [timeRange, setTimeRange] = useState('30d'); // '7d' | '30d' | '90d' | 'all'

  // Filter sessions by day based on selected timeRange
  const filteredSessionsByDay = useMemo(() => {
    if (!dashData?.sessionsByDay) return {};
    if (timeRange === 'all') return dashData.sessionsByDay;

    const daysLimit = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const now = Date.now();
    const result = {};

    Object.entries(dashData.sessionsByDay).forEach(([dayStr, count]) => {
      const ts = new Date(dayStr).getTime();
      if (!ts) {
        result[dayStr] = count;
        return;
      }
      const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
      if (ageDays <= daysLimit) {
        result[dayStr] = count;
      }
    });

    return result;
  }, [dashData?.sessionsByDay, timeRange]);

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

  const studioSessions = dashData.totalSessions || 0;
  const isStudioTelemetryEarly = studioSessions < 5;

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

      {/* ── Analytics Header & Time Filter ───────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginTop: '2rem',
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            📊 Studio Telemetry & Insights
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Google Play Console / Steamworks telemetry cross-game aggregate
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Window:
          </span>
          <div style={{ display: 'flex', gap: '0.35rem' }} role="group" aria-label="Studio Time Window">
            {[
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: 'all', label: 'All Time' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                style={{
                  background: timeRange === btn.id ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                  borderColor: timeRange === btn.id ? 'rgba(0, 212, 255, 0.4)' : 'transparent',
                  color: timeRange === btn.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
                onClick={() => setTimeRange(btn.id)}
                aria-pressed={timeRange === btn.id}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isStudioTelemetryEarly && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.08), rgba(0, 212, 255, 0.05))',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>📡</span>
          <span>
            <strong style={{ color: 'var(--accent-yellow)' }}>Telemetry initializing:</strong> Your studio has {studioSessions} total session{studioSessions === 1 ? '' : 's'}. Charts will expand as players engage across your published games.
          </span>
        </div>
      )}

      {/* ── Analytics Charts ─────────────────────── */}
      <div className="pub-charts">
        <PublisherSessionChart sessionsByDay={filteredSessionsByDay} />
        <PublisherViewsChart games={dashData.myGames} />
      </div>

    </div>
  );
}

export default Dashboard;
