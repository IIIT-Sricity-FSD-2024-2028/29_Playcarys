import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import publisherService from '../../services/publisherService';
import Money from '../../utils/money';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/publisher/earnings.css';

export function Earnings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useContext(AuthContext);

  const [earnData, setEarnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadEarnings() {
    if (!user || user.role !== 'publisher') return;
    setLoading(true);
    setError(null);

    try {
      const uid = user.userId || user.id;
      const data = await publisherService.getEarnings(uid);
      setEarnData(data);
    } catch (err) {
      console.error('Failed to load publisher earnings:', err);
      setError(err.message || 'Could not load earnings data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user && user.role === 'publisher') {
      loadEarnings();
    }
  }, [authLoading, user]);

  // Auth Guard
  if (authLoading) {
    return <LoadingState message="Checking publisher credentials…" minHeight="60vh" />;
  }

  if (!user || user.role !== 'publisher') {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Publisher Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            You must be signed in with a publisher account to access studio earnings.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.href = '/index.html';
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const studioLine = earnData
    ? `${earnData.studio_name || 'Your studio'} — revenue attributable to your games`
    : 'What your games have earned';

  const u = earnData?.unsettled;
  const platformPct = earnData ? 100 - earnData.share_pct : 30;

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header-row mb-2">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            id="back-to-dashboard-btn"
            className="btn btn-ghost"
            onClick={() => navigate('/publisher/dashboard')}
            style={{ padding: '0.5rem' }}
          >
            ❮ Dashboard
          </button>
          <div>
            <h1 style={{ marginBottom: 0 }}>💰 Studio Earnings</h1>
            <p className="text-muted" style={{ marginTop: '0.25rem' }} id="studio-line">
              {studioLine}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div id="earn-root">
          <div className="earn-empty">Loading…</div>
        </div>
      ) : error ? (
        <div id="earn-root">
          <div className="earn-empty">
            Could not load earnings. {error}
            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={loadEarnings}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : !earnData || !u ? (
        <div id="earn-root">
          <div className="earn-empty">No earnings data available.</div>
        </div>
      ) : (
        <div id="earn-root">
          {/* 1. Four Summary Cards */}
          <div className="earn-hero">
            <div className="earn-stat highlight">
              <div className="earn-val" style={{ color: '#10b981' }}>
                {u.net_display}
              </div>
              <div className="earn-lbl">Ready to pay out</div>
              <div className="earn-sub">
                {u.payable
                  ? 'Above the minimum'
                  : `Below the ${earnData.min_payout_display} minimum`}
              </div>
            </div>

            <div className="earn-stat">
              <div className="earn-val">{earnData.balance_display}</div>
              <div className="earn-lbl">Awaiting transfer</div>
              <div className="earn-sub">Closed, not yet sent</div>
            </div>

            <div className="earn-stat">
              <div className="earn-val">{earnData.lifetime_earned_display}</div>
              <div className="earn-lbl">Lifetime earned</div>
            </div>

            <div className="earn-stat">
              <div className="earn-val">
                {Money.formatCarys(earnData.revenue_pcp)}
              </div>
              <div className="earn-lbl">Session royalty (Carys)</div>
              <div className="earn-sub">Engagement counter, all time</div>
            </div>
          </div>

          {/* 2. How This Period Splits */}
          <div className="earn-section">
            <h2>How this period splits</h2>
            <p className="lead">
              You keep {earnData.share_pct}% of everything attributable to your games. The platform keeps{' '}
              {platformPct}% to run review, moderation and hosting.
            </p>
            <div className="split-bar">
              <div className="split-you" style={{ width: `${earnData.share_pct}%` }}>
                You — {u.net_display} ({earnData.share_pct}%)
              </div>
              <div className="split-platform" style={{ width: `${platformPct}%` }}>
                Platform — {Money.formatINR(u.platform_cut_paise)} ({platformPct}%)
              </div>
            </div>
            <div style={{ marginTop: '1rem' }} className="card-box">
              <table className="earn-table">
                <tbody>
                  <tr>
                    <td>Session royalty</td>
                    <td className="num">{Money.formatCarys(u.royalty_carys)} Carys</td>
                    <td className="num">{Money.formatINR(u.royalty_paise)}</td>
                  </tr>
                  <tr>
                    <td>Tournament rake share</td>
                    <td className="num">—</td>
                    <td className="num">{Money.formatINR(u.rake_paise)}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Gross this period</strong>
                    </td>
                    <td className="num"></td>
                    <td className="num">
                      <strong>{Money.formatINR(u.gross_paise)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. By Game */}
          <div className="earn-section">
            <h2>By game</h2>
            <p className="lead">Lifetime attribution per title — which of your games actually earns.</p>
            <div className="card-box">
              {earnData.per_game && earnData.per_game.length > 0 ? (
                <table className="earn-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th className="num">Sessions</th>
                      <th className="num">Royalty</th>
                      <th className="num">Rake</th>
                      <th className="num">Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnData.per_game.map((g) => (
                      <tr key={g.game_id}>
                        <td>{g.game_name}</td>
                        <td className="num">{(g.sessions || 0).toLocaleString('en-IN')}</td>
                        <td className="num">{g.royalty_display}</td>
                        <td className="num">{g.rake_display}</td>
                        <td className="num">
                          <strong>{g.gross_display}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="earn-empty">No games published yet.</div>
              )}
            </div>
          </div>

          {/* 4. Payout History */}
          <div className="earn-section">
            <h2>Payout history</h2>
            <p className="lead">
              Each row is a closed period. A payout is a historical record and is never edited.
            </p>
            <div className="card-box">
              {earnData.history && earnData.history.length > 0 ? (
                <table className="earn-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th className="num">Gross</th>
                      <th className="num">Platform</th>
                      <th className="num">You receive</th>
                      <th>Status</th>
                      <th>Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnData.history.map((p) => (
                      <tr key={p.payout_id || p.period}>
                        <td>{p.period}</td>
                        <td className="num">{Money.formatINR(p.gross_paise)}</td>
                        <td className="num">{Money.formatINR(p.platform_cut_paise)}</td>
                        <td className="num">
                          <strong>{p.net_display}</strong>
                        </td>
                        <td>
                          <span className={`pill ${p.status}`}>{p.status}</span>
                        </td>
                        <td>{(p.created_at || '').slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="earn-empty">No payouts closed yet.</div>
              )}
            </div>
          </div>

          {/* 5. How You Get Paid Note */}
          <div className="earn-note">
            <strong>How you get paid.</strong> Revenue accrues continuously as your games are played and
            your tournaments run. An admin closes a period, which moves your {earnData.share_pct}% share into
            "awaiting transfer". Nothing under {earnData.min_payout_display} is sent — it costs more to transfer
            than it is worth, so it simply rolls into the next period.
          </div>
        </div>
      )}
    </div>
  );
}

export default Earnings;
