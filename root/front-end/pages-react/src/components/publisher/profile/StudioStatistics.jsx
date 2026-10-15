import React from 'react';
import { formatDate } from '../../../services/publisherService';

export function StudioStatistics({
  avgRating = 'N/A',
  totalViews = 0,
  totalSessions = 0,
  tournamentsHosted = 0,
  revenuePcp = 0,
  joinDate,
  status = 'active'
}) {
  const statRows = [
    {
      label: '⭐ Overall Rating',
      val: avgRating,
      color: 'var(--accent-yellow)'
    },
    {
      label: '👁️ Total Views',
      val: Number(totalViews).toLocaleString(),
      color: 'var(--text-primary)'
    },
    {
      label: '🕹️ Total Sessions',
      val: Number(totalSessions).toLocaleString(),
      color: 'var(--accent-cyan)'
    },
    {
      label: '🏆 Tournaments Hosted',
      val: tournamentsHosted,
      color: 'var(--accent-purple)'
    },
    {
      label: '💰 Revenue (PCP)',
      val: `${Number(revenuePcp).toLocaleString()} PCP`,
      color: 'var(--accent-yellow)'
    },
    {
      label: '📅 Joined Date',
      val: formatDate(joinDate),
      color: 'var(--text-primary)'
    },
    {
      label: '✅ Account Status',
      val: status.charAt(0).toUpperCase() + status.slice(1),
      color: status === 'active' ? 'var(--accent-green)' : 'var(--accent-red)'
    }
  ];

  return (
    <div className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        📊 Studio Statistics
      </h3>
      <div>
        {statRows.map((row, idx) => (
          <div key={idx} className="stat-row">
            <span className="label">{row.label}</span>
            <span className="val" style={{ color: row.color }}>
              {row.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudioStatistics;
