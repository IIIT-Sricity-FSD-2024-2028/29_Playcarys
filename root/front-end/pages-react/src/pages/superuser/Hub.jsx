import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import {
  fetchPlatformStats,
  fetchRecentActivity
} from '../../services/superuserService';
import SuperuserHubHero from '../../components/superuser/hub/SuperuserHubHero';
import SuperuserHubKPIs from '../../components/superuser/hub/SuperuserHubKPIs';
import SuperuserHubQuickNavigation from '../../components/superuser/hub/SuperuserHubQuickNavigation';
import SuperuserHubRecentActivity from '../../components/superuser/hub/SuperuserHubRecentActivity';
import SuperuserHubPlatformRatios from '../../components/superuser/hub/SuperuserHubPlatformRatios';
import SuperuserHubSystemStatus from '../../components/superuser/hub/SuperuserHubSystemStatus';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/superuser/hub.css';

export function Hub() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activeSessions, setActiveSessions] = useState(0);
  const [totalOnline, setTotalOnline] = useState(0);
  const [feed, setFeed] = useState([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [tournaments, setTournaments] = useState([]);
  const [loadedRows, setLoadedRows] = useState(0);

  useEffect(() => {
    document.title = 'PlayCarys — Superuser Hub';

    const currentSession = authService.requireAuth(['superuser']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setUnauthorized(false);
    setSession(currentSession);

    // Fetch live data directly from NestJS backend
    Promise.allSettled([
      fetchPlatformStats(),
      fetchRecentActivity(7)
    ]).then(([statsRes, actRes]) => {
      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value;
        setStats(s);
        setActiveSessions(s.activeSessions || 0);

        const raw = s._raw || {};
        const sessions = raw.sessions || [];
        const liveSessions = sessions.filter(
          (m) => m.status === 'in-progress' || m.status === 'active' || m.status === 'waiting'
        );
        setTotalOnline(
          liveSessions.reduce(
            (a, m) => a + (Array.isArray(m.player_ids) ? m.player_ids.length : (m.current_players || 1)),
            0
          )
        );

        setReportsCount((raw.reports || []).length);
        setTournaments(raw.tournaments || []);

        const rows =
          (raw.users || []).length +
          (raw.games || []).length +
          sessions.length +
          (raw.bans || []).length;
        setLoadedRows(rows);
      }
      if (actRes.status === 'fulfilled') {
        setFeed(actRes.value);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (unauthorized) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Superuser Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            The Superuser Control Hub requires Superuser privileges.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              navigate('/');
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="page-content">
      {/* Hero */}
      <SuperuserHubHero />

      {loading ? (
        <LoadingState message="Fetching live control hub data..." minHeight="250px" />
      ) : (
        <>
          {/* KPIs */}
          <SuperuserHubKPIs
            stats={stats}
            activeSessions={activeSessions}
            totalOnline={totalOnline}
          />

          {/* Quick Navigation */}
          <SuperuserHubQuickNavigation />

          {/* Bottom: Feed + Health */}
          <div className="bottom-grid">
            <SuperuserHubRecentActivity feed={feed} />
            <div className="card">
              <h3 className="mb-2">📊 Platform Ratios</h3>
              <SuperuserHubPlatformRatios
                stats={stats}
                reportsCount={reportsCount}
                tournaments={tournaments}
              />
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-primary)'
                }}
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em'
                  }}
                >
                  System Status
                </div>
                <SuperuserHubSystemStatus loadedRows={loadedRows} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Hub;
