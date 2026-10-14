/*
 * Concepts used in this component:
 *  - Components, Props (active, addAudit, onReview), State (status filter), Events (clicks, choosing),
 *    Lists (game table rows), Hooks (useState, useContext), Forms (controlled filter dropdown),
 *    Context (AdminContext), Callbacks (confirmAction runs Delete only after "Confirm")
 *
 * "Game Control Panel" section of the old hub.html: game numbers and a table where a pending game
 * is sent to the review console, an approved game can be blacklisted or re-enabled, and any
 * game can be deleted.
 */
import React, { useState, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import KpiCard from './KpiCard';
import GameIcon from '../common/GameIcon';
import StatusBadge from '../common/StatusBadge';
import { getDB, getPlatformStats } from '../../../services/adminService';
import { listHubGames, toggleGameEnabled, deleteGame } from '../../../services/adminHubService';

export function GamesSection(props) {
  const { active, addAudit, onReview } = props;
  const { toast, confirmAction, refresh } = useContext(AdminContext);
  const [filter, setFilter] = useState('');

  const db = getDB();
  const s = getPlatformStats();
  const blacklisted = db.games.filter((g) => g.status === 'approved' && !g.enabled).length;
  const games = listHubGames(filter);

  // Pending games are decided in the review console, not here.
  function handleToggle(row) {
    const g = db.games.find((x) => x.id === row.id) || row; // always the live row, never an old copy
    toggleGameEnabled(g, addAudit);
    toast.info(`${g.title} ${g.enabled ? 'enabled' : 'blacklisted'}`);
    refresh();
  }

  function handleDelete(row) {
    const g = db.games.find((x) => x.id === row.id) || row;
    confirmAction('Delete Game', `Delete "${g.title}"?`, () => {
      deleteGame(g, addAudit);
      toast.success('Game deleted');
      refresh();
    });
  }

  return (
    <div className={'hub-section' + (active ? ' active' : '')} id="sec-games">
      <div className="flex items-center justify-between mb-2">
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Game Control Panel</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="form-select" id="g-filter" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: '150px' }}>
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="kpi-row mb-2">
        <KpiCard color="var(--accent-cyan)" label="Total" value={db.games.length} icon="🎮" />
        <KpiCard color="var(--accent-green)" label="Approved" value={s.approvedGames} icon="✅" />
        <KpiCard color="var(--accent-yellow)" label="Pending" value={s.pendingGames} icon="⏳" />
        <KpiCard color="var(--accent-red)" label="Blacklisted" value={blacklisted} icon="⛔" />
      </div>

      <div className="user-table-wrap">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Game</th>
                <th>Publisher</th>
                <th>Genre</th>
                <th>Status</th>
                <th>Enabled</th>
                <th>Views</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="games-tbody">
              {games.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <GameIcon game={g} index={0} size="40px" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{g.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{g.players} players</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{g.publisher}</td>
                  <td><span className="tag" style={{ fontSize: '0.7rem' }}>{g.genre}</span></td>
                  <td><StatusBadge status={g.status} /></td>
                  <td>{g.status === 'approved' ? (g.enabled ? <StatusBadge status="enabled" /> : <StatusBadge status="blacklisted" />) : '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>{(g.views / 1000 || 0).toFixed(1)}K</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {g.status === 'pending' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => onReview(g.id)} title="Open the build review console">🔍 Review</button>
                      ) : null}
                      {g.status === 'approved' ? (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleToggle(g)}
                          style={g.enabled
                            ? { color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.5)' }
                            : { color: 'var(--accent-green)', borderColor: 'rgba(16,185,129,0.5)' }}
                        >
                          {g.enabled ? '🔒 Blacklist' : '🔓 Enable'}
                        </button>
                      ) : null}
                      <button className="btn btn-red btn-sm" onClick={() => handleDelete(g)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GamesSection;
