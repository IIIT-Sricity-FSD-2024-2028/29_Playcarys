/*
 * Concepts used in this component:
 *  - Components, Props (active), Lists (bars, legend, leaderboard rows), Context (AdminContext, so it
 *    redraws when DB changes)
 *
 * "Platform Analytics" section of the old hub.html: sessions per game, the user-distribution donut
 * (drawn with SVG circles), a views leaderboard, the tournament prize pool, and the player win-rate table.
 */
import React, { useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import StatusBadge from '../common/StatusBadge';
import { getDB, getPlatformStats } from '../../../services/adminService';

const MEDAL_COLORS = ['var(--accent-yellow)', 'var(--text-secondary)', '#cd7f32'];

export function AnalyticsSection(props) {
  const { active } = props;
  useContext(AdminContext); // redraw when AdminContext.refresh() is called

  const db = getDB();
  const s = getPlatformStats();

  // Sessions per game (first six approved games)
  const chartGames = db.games.filter((g) => g.status === 'approved').slice(0, 6);
  const maxSess = Math.max(...chartGames.map((g) => g.sessions), 1);

  // User distribution donut
  const segments = [
    { label: 'Players', pct: s.players / s.totalUsers, color: '#00d4ff', count: s.players },
    { label: 'Publishers', pct: s.publishers / s.totalUsers, color: '#10b981', count: s.publishers },
    { label: 'Moderators', pct: s.moderators / s.totalUsers, color: '#7c3aed', count: s.moderators },
    { label: 'Admins', pct: s.admins / s.totalUsers, color: '#f59e0b', count: s.admins }
  ];
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
        key={seg.label}
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

  // Views leaderboard
  const byViews = [...db.games].sort((a, b) => b.views - a.views);
  const maxViews = (byViews[0] && byViews[0].views) || 1;

  // Prize pool
  const totalPrize = db.tournaments.reduce((sum, t) => {
    const n = parseInt(t.prize && t.prize.replace(/\D/g, '')) || 0;
    return sum + n;
  }, 0);

  // Player win rate
  const players = db.users
    .filter((u) => u.role === 'player' && u.matches > 0)
    .sort((a, b) => (b.wins / b.matches) - (a.wins / a.matches));

  return (
    <div className={'hub-section' + (active ? ' active' : '')} id="sec-analytics">
      <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Platform Analytics</h2>

      <div className="cards-grid-2 mb-2">
        <div className="card">
          <h3 className="mb-2">🎮 Sessions per Game</h3>
          <div className="bar-chart" id="sessions-chart">
            {chartGames.map((g) => (
              <div className="bar-col" key={g.id}>
                <div className="bar-val">{g.sessions}</div>
                <div className="bar-fill" style={{ height: Math.round((g.sessions / maxSess) * 120) + 'px' }} title={`${g.title}: ${g.sessions} sessions`}></div>
                <div className="bar-label">{g.title.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="mb-2">👥 User Distribution</h3>
          <div className="donut-wrap" id="donut-wrap">
            <svg className="donut-svg" width="160" height="160" viewBox="0 0 160 160">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={stroke} />
              {circles}
              <text x={cx} y={cy} textAnchor="middle" dy="0.35em" fill="white" fontSize="14" fontFamily="Orbitron,monospace" fontWeight="700">{s.totalUsers}</text>
            </svg>
            <div className="donut-legend">
              {segments.map((seg) => (
                <div className="donut-legend-item" key={seg.label}>
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
            {byViews.map((g, i) => (
              <div className="analytics-bar-row" key={g.id}>
                <div style={{ width: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{i + 1}</div>
                <div className="analytics-bar-label" style={{ width: '110px' }}>{g.title.slice(0, 12)}{g.title.length > 12 ? '…' : ''}</div>
                <div className="analytics-bar-track"><div className="analytics-bar-fill" style={{ width: Math.round((g.views / maxViews) * 100) + '%' }}></div></div>
                <div className="analytics-bar-val">{(g.views / 1000).toFixed(1)}K</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="mb-2">💰 Tournament Prize Pool</h3>
          <div id="prize-summary">
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: '2.5rem', fontWeight: 800, background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>${totalPrize.toLocaleString()}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.5rem 0' }}>Total Prize Pool Across All Tournaments</div>
            </div>
            {db.tournaments.map((t) => (
              <div className="analytics-bar-row" key={t.id}>
                <div className="analytics-bar-label" style={{ width: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name.split(' ').slice(0, 2).join(' ')}</div>
                <div style={{ flex: 1 }}></div>
                <StatusBadge status={t.status} />
                <div style={{ width: '55px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--accent-yellow)', fontWeight: 600 }}>{t.prize}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2">🏅 Player Win Rate Leaderboard</h3>
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
              {players.map((u, i) => {
                const wr = Math.round((u.wins / u.matches) * 100);
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, color: MEDAL_COLORS[i] || 'var(--text-muted)' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div className="avatar avatar-sm">{u.avatar}</div>{u.username}</div></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.matches}</td>
                    <td style={{ color: 'var(--accent-green)' }}>{u.wins}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden', width: '80px' }}>
                          <div style={{ height: '100%', width: wr + '%', background: 'var(--gradient-brand)', borderRadius: '99px' }}></div>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{wr}%</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{u.level}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsSection;
