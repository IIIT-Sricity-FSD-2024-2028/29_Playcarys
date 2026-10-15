/*
 * Concepts used in this component:
 *  - Components, Props (active, onShowSection, onNavigate), Lists (health bars, alerts, feed rows),
 *    Events (alert and button clicks), Callbacks, Context (AdminContext, so it redraws when DB changes)
 *
 * "Platform Overview" section of the old hub.html: the four key numbers, platform health bars,
 * the attention list, and the live activity feed.
 */
import React, { useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import KpiCard from './KpiCard';
import { getDB, getPlatformStats } from '../../../services/adminService';
// (The old page showed nothing here because getPlatformStats() has no activeTournaments field;
// the Tournaments section's own "Active" count is used instead.)
import { tournamentCounts } from '../../../services/adminHubService';

const FEED_ICONS = { publisher: '🟢', approval: '🟡', player: '🔵', tournament: '🏆', ban: '🔴', system: '⚙️' };
const FEED_COLORS = {
  publisher: 'rgba(16,185,129,0.15)',
  approval: 'rgba(245,158,11,0.12)',
  player: 'rgba(0,212,255,0.12)',
  tournament: 'rgba(124,58,237,0.15)',
  ban: 'rgba(239,68,68,0.12)',
  system: 'rgba(0,212,255,0.08)'
};

export function OverviewSection(props) {
  const { active, onShowSection, onNavigate } = props;
  useContext(AdminContext); // redraw when AdminContext.refresh() is called

  const db = getDB();
  const s = getPlatformStats();

  // Matches being played right now, and how many people are in them.
  const liveMatches = (db.matches || []).filter((m) => m.status === 'in-progress');
  const totalPlayers = liveMatches.reduce(
    (a, m) => a + (Array.isArray(m.participants) ? m.participants.length : 1), 0
  );

  const healths = [
    ['User Activity', Math.round((s.players / s.totalUsers) * 100), 'var(--accent-cyan)'],
    ['Game Engagement', Math.round((s.activeGames / s.totalGames) * 100), 'var(--accent-green)'],
    ['Report Rate', Math.round((s.pendingReports / Math.max(s.totalUsers, 1)) * 100), 'var(--accent-yellow)'],
    ['Ban Rate', Math.round((s.activeBans / Math.max(s.players, 1)) * 100), 'var(--accent-red)'],
    ['Tournament Fill', Math.round((db.tournaments.reduce((a, t) => a + t.participants, 0) / Math.max(db.tournaments.reduce((a, t) => a + t.maxParticipants, 0), 1)) * 100), 'var(--accent-purple)']
  ];

  // What needs attention. `go` is what a click on that row does.
  const alerts = [];
  if (s.pendingGames > 0) alerts.push({ icon: '🟡', msg: `${s.pendingGames} game(s) awaiting approval`, go: () => onShowSection('games') });
  if (s.pendingReports > 0) alerts.push({ icon: '🔴', msg: `${s.pendingReports} report(s) pending review`, go: () => onNavigate('approvals') });
  if (s.activeBans > 0) alerts.push({ icon: '🚫', msg: `${s.activeBans} player(s) currently banned`, go: () => onShowSection('users') });
  if ((db.matches || []).filter((m) => m.status === 'in-progress').length === 0) alerts.push({ icon: '🟠', msg: 'No matches being played right now', go: null });
  if (!alerts.length) alerts.push({ icon: '✅', msg: 'All systems operating normally', go: null });

  return (
    <div className={'hub-section' + (active ? ' active' : '')} id="sec-overview">
      <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Platform Overview</h2>

      <div className="kpi-row">
        <KpiCard color="var(--accent-cyan)" label="Total Users" value={s.totalUsers} icon="👥">
          <div className="kpi-trend up" id="kpi-users-trend">↑ {s.players} players, {s.publishers} publishers</div>
        </KpiCard>
        <KpiCard color="var(--accent-green)" label="Active Games" value={s.activeGames} icon="🎮">
          <div className="kpi-sub">of <span id="kpi-games-total">{s.totalGames}</span> total</div>
        </KpiCard>
        <KpiCard color="var(--accent-yellow)" label="Live Sessions" value={liveMatches.length} icon="▶️">
          <div className="kpi-sub" id="kpi-sessions-players">{totalPlayers} players in game</div>
        </KpiCard>
        <KpiCard color="var(--accent-purple)" label="Active Tournaments" value={tournamentCounts().active} icon="🏆">
          <div className="kpi-sub" id="kpi-tourns-up">{s.upcomingTournaments} upcoming</div>
        </KpiCard>
      </div>

      <div className="overview-grid">
        <div className="card">
          <h3 className="mb-2">📡 Platform Health</h3>
          <div className="platform-health" id="health-bars">
            {healths.map(([label, pct, color]) => (
              <div className="health-item" key={label}>
                <span className="health-label">{label}</span>
                <div className="health-bar"><div className="health-fill" style={{ width: pct + '%', background: color }}></div></div>
                <span className="health-val" style={{ color: color }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-2">🚨 Attention Required</h3>
          <div id="alerts-list">
            {alerts.map((a, i) => (
              <div
                className="list-item"
                style={{ padding: '0.7rem 0.9rem', cursor: a.go ? 'pointer' : 'default' }}
                onClick={a.go || undefined}
                key={i}
              >
                <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
                <div className="list-item-info" style={{ fontSize: '0.875rem' }}>{a.msg}</div>
                {a.go ? <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-2">
        <div className="flex items-center justify-between mb-2">
          <h3>⚡ Live Activity Feed</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onShowSection('audit')}>Full Audit Log →</button>
        </div>
        <div id="live-feed">
          {db.activityLog.slice(0, 6).map((a, i) => (
            <div className="audit-entry" key={i}>
              <div className="audit-time">{a.time}</div>
              <div className="audit-icon" style={{ background: FEED_COLORS[a.type] || 'var(--bg-secondary)' }}>{FEED_ICONS[a.type] || '📌'}</div>
              <div className="audit-body"><div className="audit-title">{a.msg}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OverviewSection;
