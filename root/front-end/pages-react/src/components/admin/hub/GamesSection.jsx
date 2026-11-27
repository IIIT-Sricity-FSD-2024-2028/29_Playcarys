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
import React, { useState, useEffect, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchGames,
  setGameState,
  deleteGame as deleteGameThunk
} from '../../../features/games/gameSlice';
import { fetchGameReview as fetchGameReviewThunk } from '../../../features/games/gameReviewSlice';
import { selectAllGames } from '../../../features/games/selectors';
import KpiCard from './KpiCard';
import GameIcon from '../common/GameIcon';
import StatusBadge from '../common/StatusBadge';

function toHubGame(game) {
  return {
    ...game,
    id: game.id || game.game_id,
    title: game.title || game.game_name || 'Untitled game',
    publisher: game.publisher || game.game_publisher || game.publisher_name || '—',
    genre: game.genre || game.game_type || '—',
    status: game.status || game.game_approval_status || 'pending',
    enabled: game.enabled !== false,
    players: Number(game.players || game.player_count || 0),
    views: Number(game.views || game.view_count || 0)
  };
}

export function GamesSection(props) {
  const { active, addAudit, onNavigate } = props;
  const { toast, confirmAction, refresh } = useContext(AdminContext);
  const dispatch = useAppDispatch();
  const allGames = useAppSelector(selectAllGames);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    dispatch(fetchGames()).unwrap().catch((err) => toast.error(err || 'Could not load games'));
  }, [dispatch, toast]);

  const hubGames = allGames.map(toHubGame);
  const games = filter ? hubGames.filter((game) => game.status === filter) : hubGames;
  const approvedGames = hubGames.filter((game) => game.status === 'approved');
  const pendingGames = hubGames.filter((game) => game.status === 'pending');
  const blacklisted = approvedGames.filter((game) => !game.enabled).length;

  // Pending games are decided in the review console, not here.
  async function handleToggle(row) {
    const g = row;
    try {
      await dispatch(setGameState({ id: g.id, enabled: !g.enabled })).unwrap();
      addAudit('game', `${g.title} ${g.enabled ? 'blacklisted' : 'enabled'}`, 'Updated through Redux');
      toast.info(`${g.title} ${g.enabled ? 'blacklisted' : 'enabled'}`);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to toggle game state');
    }
  }

  function handleDelete(row) {
    const g = row;
    confirmAction('Delete Game', `Delete "${g.title}"?`, async () => {
      try {
        await dispatch(deleteGameThunk(g.id)).unwrap();
        addAudit('game', `${g.title} deleted`, 'Deleted through Redux');
        toast.success('Game deleted');
        refresh();
      } catch (err) {
        toast.error(err.message || 'Failed to delete game');
      }
    });
  }

  async function handleReview(gameId) {
    // Review button → this handler → Redux thunk → review console.
    try {
      await dispatch(fetchGameReviewThunk({ id: gameId, role: 'admin' })).unwrap();
    } catch (err) {
      // The review console reports unavailable builds after navigation.
    }
    onNavigate('game-review', '?gameId=' + encodeURIComponent(gameId));
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
        <KpiCard color="var(--accent-cyan)" label="Total" value={hubGames.length} icon="🎮" />
        <KpiCard color="var(--accent-green)" label="Approved" value={approvedGames.length} icon="✅" />
        <KpiCard color="var(--accent-yellow)" label="Pending" value={pendingGames.length} icon="⏳" />
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
                        <button className="btn btn-primary btn-sm" onClick={() => handleReview(g.id)} title="Open the build review console">🔍 Review</button>
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
