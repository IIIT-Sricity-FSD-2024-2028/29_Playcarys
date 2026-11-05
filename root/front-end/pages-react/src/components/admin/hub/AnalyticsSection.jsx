/*
 * Concepts used in this component:
 *  - Components, Props (active), State (the analytics from the server), Hooks (useState, useEffect),
 *    Lists (bars, legend, leaderboard rows), API calls (GET /analytics, repeated every 30 seconds)
 *
 * "Platform Analytics" section of the Control Hub: sessions per game, the user-distribution donut
 * (drawn with SVG circles), a views leaderboard, the tournament prize pool, and the player win-rate
 * table. Every number comes from the server's own records (see adminAnalyticsService), not from a
 * counter kept in the browser.
 */
import React, { useState, useEffect } from 'react';
import StatusBadge from '../common/StatusBadge';
import { fetchAnalytics, formatRupees } from '../../../services/adminAnalyticsService';

const MEDAL_COLORS = ['var(--accent-yellow)', 'var(--text-secondary)', '#cd7f32'];

const ROLE_SEGMENTS = [
  { key: 'player', label: 'Players', color: '#00d4ff' },
  { key: 'publisher', label: 'Publishers', color: '#10b981' },
  { key: 'moderator', label: 'Moderators', color: '#7c3aed' },
  { key: 'admin', label: 'Admins', color: '#f59e0b' },
  { key: 'superuser', label: 'Superusers', color: '#ef4444' }
];

const emptyNote = { textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' };

export function AnalyticsSection(props) {
  const { active } = props;
  // undefined = loading, null = the server could not be reached
  const [data, setData] = useState(undefined);

  async function load() {
    setData(await fetchAnalytics());
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  // Open the tab and it shows the newest numbers straight away.
  useEffect(() => {
    if (active) load();
  }, [active]);

  const wrap = (children) => (
    <div className={'hub-section' + (active ? ' active' : '')} id="sec-analytics">
      <div className="flex items-center justify-between mb-2">
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Platform Analytics</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>
      {children}
    </div>
  );

  if (data === undefined) return wrap(<div className="card" style={emptyNote}>Loading analytics…</div>);
  if (data === null) {
    return wrap(
      <div className="card" style={emptyNote}>
        Could not load analytics from the server. Check that the backend is running, then press Refresh.
      </div>
    );
  }

  // Sessions per game: the games that have any, busiest first.
  const chartGames = data.games.filter((g) => g.sessions > 0).sort((a, b) => b.sessions - a.sessions).slice(0, 8);
  const maxSess = Math.max(...chartGames.map((g) => g.sessions), 1);

  // User distribution donut
  const totalUsers = data.totals.users;
  const segments = ROLE_SEGMENTS.map((seg) => ({
    ...seg,
    count: data.roles[seg.key] || 0,
    pct: totalUsers ? (data.roles[seg.key] || 0) / totalUsers : 0
  }));
  const r = 60;
  const cx = 80;
  const cy = 80;
  const stroke = 22;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const circles = segments.map((seg) => {
    const dash = seg.pct * circ;
    const el = (
      <circle
        key={seg.key}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        style={{ transition: 'all 0.5s', opacity: 0.85 }}
        transform={`rotate(-90,${cx},${cy})`}
      />
    );
    offset += dash;
    return el;
  });

  // Views leaderboard: approved games, most viewed first.
  const byViews = data.games.filter((g) => g.approval === 'approved').sort((a, b) => b.views - a.views);
  const maxViews = Math.max(...byViews.map((g) => g.views), 1);

  const updated = new Date(data.generated_at).toLocaleTimeString();

  return wrap(
    <>
      <div className="cards-grid-2 mb-2">
        <div className="card">
          <h3 className="mb-2">🎮 Sessions per Game</h3>
          {chartGames.length ? (
            <div className="bar-chart" id="sessions-chart">
              {chartGames.map((g) => (
                <div className="bar-col" key={g.game_id}>
                  <div className="bar-val">{g.sessions}</div>
                  <div
                    className="bar-fill"
                    style={{ height: Math.round((g.sessions / maxSess) * 120) + 'px' }}
                    title={`${g.game_name}: ${g.sessions} sessions (${g.completed_sessions} completed), ${g.matches_played} matches played`}
                  ></div>
                  <div className="bar-label">{g.game_name.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyNote}>No game sessions have been created yet.</div>
          )}
        </div>
        <div className="card">
          <h3 className="mb-2">👥 User Distribution</h3>
          <div className="donut-wrap" id="donut-wrap">
            <svg className="donut-svg" width="160" height="160" viewBox="0 0 160 160">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={stroke} />
              {circles}
              <text x={cx} y={cy} textAnchor="middle" dy="0.35em" fill="white" fontSize="14" fontFamily="Orbitron,monospace" fontWeight="700">{totalUsers}</text>
            </svg>
            <div className="donut-legend">
              {segments.map((seg) => (
                <div className="donut-legend-item" key={seg.key}>
                  <div className="donut-dot" style={{ background: seg.color }}></div>
                  <span>{seg.label}: <strong>{seg.count}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="cards-grid-2 mb-2">
        <div className="card">
          <h3 className="mb-2">👁 Game Views Leaderboard</h3>
          <div id="views-leaderboard">
            {byViews.length ? byViews.map((g, i) => (
              <div className="analytics-bar-row" key={g.game_id}>
                <div style={{ width: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{i + 1}</div>
                <div className="analytics-bar-label" style={{ width: '110px' }}>{g.game_name.slice(0, 12)}{g.game_name.length > 12 ? '…' : ''}</div>
                <div className="analytics-bar-track"><div className="analytics-bar-fill" style={{ width: Math.round((g.views / maxViews) * 100) + '%' }}></div></div>
                <div className="analytics-bar-val">{g.views.toLocaleString('en-IN')}</div>
              </div>
            )) : (
              <div style={emptyNote}>No approved games yet.</div>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="mb-2">💰 Tournament Prize Pool</h3>
          <div id="prize-summary">
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: '2.5rem', fontWeight: 800, background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{formatRupees(data.totals.prize_pool_paise)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.5rem 0' }}>Total Prize Pool Across All Tournaments</div>
            </div>
            {data.tournaments.length ? data.tournaments.map((t) => (
              <div className="analytics-bar-row" key={t.tournament_id}>
                <div className="analytics-bar-label" style={{ width: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.name}>{t.name.split(' ').slice(0, 2).join(' ')}</div>
                <div style={{ flex: 1 }}></div>
                <StatusBadge status={t.status} />
                <div style={{ width: '70px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--accent-yellow)', fontWeight: 600 }}>{formatRupees(t.prize_pool_paise)}</div>
              </div>
            )) : (
              <div style={emptyNote}>No tournaments yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2">🏅 Player Win Rate Leaderboard</h3>
        {data.players.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Matches</th>
                  <th>Wins</th>
                  <th>Win Rate</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody id="winrate-tbody">
                {data.players.map((u, i) => (
                  <tr key={u.user_id}>
                    <td style={{ fontWeight: 700, color: MEDAL_COLORS[i] || 'var(--text-muted)' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div className="avatar avatar-sm">{u.avatar}</div>{u.user_name}</div></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.matches}</td>
                    <td style={{ color: 'var(--accent-green)' }}>{u.wins}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden', width: '80px' }}>
                          <div style={{ height: '100%', width: u.win_rate + '%', background: 'var(--gradient-brand)', borderRadius: '99px' }}></div>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{u.win_rate}%</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{u.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={emptyNote}>No matches have been played yet.</div>
        )}
      </div>

      <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.75rem' }}>
        Live from the server: {data.totals.sessions} sessions, {data.totals.matches_played} matches played,
        {' '}{data.totals.views.toLocaleString('en-IN')} game views. Updated {updated}.
      </p>
    </>
  );
}

export default AnalyticsSection;
