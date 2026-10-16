import React from 'react';

export function formatDate(dateStr) {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function SessionKpiCards({ matches = [] }) {
  const totalRaw = matches.length;
  const inprog = matches.filter((m) => m.status === 'in-progress').length;

  const sessionsByDay = {};
  matches.forEach((s) => {
    const raw = s.created_at || s.start_time || s.end_time;
    if (!raw) return;
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return;
    const d = parsed.toISOString().split('T')[0];
    sessionsByDay[d] = (sessionsByDay[d] || 0) + 1;
  });

  const daysWithActivity = Object.keys(sessionsByDay).length || 1;
  const avgPerDay = totalRaw > 0 ? Math.round(totalRaw / daysWithActivity) : 0;

  let peakDay = 'N/A';
  let peakCount = 0;
  for (const d in sessionsByDay) {
    if (sessionsByDay[d] > peakCount) {
      peakCount = sessionsByDay[d];
      peakDay = formatDate(d);
    }
  }

  const peakDayDisplay = peakCount > 0 ? `${peakDay} (${peakCount})` : 'N/A (0)';

  return (
    <div className="stats-grid stats-grid-4 mb-3" id="stats-grid">
      <div className="stat-card">
        <div className="label">Being Played Now</div>
        <div className="value text-cyan">{inprog}</div>
        <div className="icon">🎮</div>
      </div>
      <div className="stat-card">
        <div className="label">All-Time Matches</div>
        <div className="value text-purple">{totalRaw}</div>
        <div className="icon">📈</div>
      </div>
      <div className="stat-card">
        <div className="label">Avg Matches/Day</div>
        <div className="value text-green">{avgPerDay}</div>
        <div className="icon">📅</div>
      </div>
      <div className="stat-card">
        <div className="label">Peak Day</div>
        <div className="value" style={{ fontSize: '1.1rem' }}>
          {peakDayDisplay}
        </div>
        <div className="icon">🏔️</div>
      </div>
    </div>
  );
}

export default SessionKpiCards;
