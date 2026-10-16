import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import {
  fetchPlatformStats,
  fetchRecentActivity,
  getPlatformEconomy
} from '../../services/superuserService';
import SuperuserDashboardHeader from '../../components/superuser/dashboard/SuperuserDashboardHeader';
import SuperuserDashboardStats from '../../components/superuser/dashboard/SuperuserDashboardStats';
import SuperuserUserDistribution from '../../components/superuser/dashboard/SuperuserUserDistribution';
import SuperuserGamesOverview from '../../components/superuser/dashboard/SuperuserGamesOverview';
import SuperuserPlatformMoney from '../../components/superuser/dashboard/SuperuserPlatformMoney';
import SuperuserStaffingCoverage from '../../components/superuser/dashboard/SuperuserStaffingCoverage';
import SuperuserRecentActivity from '../../components/superuser/dashboard/SuperuserRecentActivity';
import SuperuserQuickActions from '../../components/superuser/dashboard/SuperuserQuickActions';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/superuser/dashboard.css';

export function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [totalGames, setTotalGames] = useState(0);
  const [activity, setActivity] = useState([]);
  const [platformData, setPlatformData] = useState(null);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [platformError, setPlatformError] = useState(false);

  useEffect(() => {
    document.title = 'PlayCarys — Superuser Dashboard';

    const currentSession = authService.requireAuth(['admin', 'superuser']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setUnauthorized(false);
    setSession(currentSession);

    // Fetch real live backend platform statistics and recent activity
    Promise.allSettled([
      fetchPlatformStats(),
      fetchRecentActivity(8)
    ]).then(([statsRes, actRes]) => {
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
        setTotalGames(statsRes.value.totalGames || 0);
      }
      if (actRes.status === 'fulfilled') {
        setActivity(actRes.value);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Platform financial and staffing data is Superuser-only
    if (currentSession.role === 'superuser') {
      getPlatformEconomy()
        .then((data) => {
          setPlatformData(data);
          setPlatformLoading(false);
          setPlatformError(false);
        })
        .catch((err) => {
          console.error('Failed to load platform data:', err);
          setPlatformLoading(false);
          setPlatformError(true);
        });
    } else {
      setPlatformLoading(false);
    }
  }, []);

  if (unauthorized) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Admin / Superuser Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            You must be logged in with an Admin or Superuser account to access this dashboard.
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
      {/* Header */}
      <SuperuserDashboardHeader />

      {loading ? (
        <LoadingState message="Fetching live platform data from server..." minHeight="250px" />
      ) : (
        <>
          {/* Stats Grid */}
          <SuperuserDashboardStats stats={stats} />

          {/* Quick Actions */}
          <SuperuserQuickActions />

          {/* User Distribution & Games Overview */}
          <div className="analytics-grid">
            <SuperuserUserDistribution stats={stats} />
            <SuperuserGamesOverview totalGames={totalGames} />
          </div>

          {/* Platform Financials & Staffing (Superuser only) */}
          {session.role === 'superuser' && (
            <div className="analytics-grid">
              <SuperuserPlatformMoney
                loading={platformLoading}
                error={platformError}
                money={platformData?.money}
                onRetry={() => {
                  setPlatformLoading(true);
                  setPlatformError(false);
                  getPlatformEconomy()
                    .then((data) => {
                      setPlatformData(data);
                      setPlatformLoading(false);
                    })
                    .catch(() => {
                      setPlatformLoading(false);
                      setPlatformError(true);
                    });
                }}
              />
              <SuperuserStaffingCoverage
                loading={platformLoading}
                error={platformError}
                staffing={platformData?.staffing}
                onRetry={() => {
                  setPlatformLoading(true);
                  setPlatformError(false);
                  getPlatformEconomy()
                    .then((data) => {
                      setPlatformData(data);
                      setPlatformLoading(false);
                    })
                    .catch(() => {
                      setPlatformLoading(false);
                      setPlatformError(true);
                    });
                }}
              />
            </div>
          )}

          {/* Recent Activity */}
          <SuperuserRecentActivity activity={activity} />
        </>
      )}
    </div>
  );
}

export default Dashboard;
