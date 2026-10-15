import React from 'react';
import GameIcon from './GameIcon';

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return <span className="badge badge-approved">Approved</span>;
  if (s === 'rejected') return <span className="badge badge-rejected">Rejected</span>;
  return <span className="badge badge-pending">Pending</span>;
}

export function GamesTable({
  games = [],
  search = '',
  onSearchChange,
  genreFilter = '',
  onGenreFilterChange,
  onView,
  onReview,
  onToggle,
  onDelete
}) {
  return (
    <div className="card mt-3" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Controls row */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        <div className="search-wrap" style={{ maxWidth: '260px' }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-input"
            id="search"
            placeholder="Search games..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          id="genre-filter"
          value={genreFilter}
          onChange={(e) => onGenreFilterChange(e.target.value)}
          style={{ width: '150px' }}
        >
          <option value="">All Genres</option>
          <option value="Battle Royale">Battle Royale</option>
          <option value="Strategy">Strategy</option>
          <option value="Racing">Racing</option>
          <option value="Puzzle">Puzzle</option>
          <option value="FPS">FPS</option>
          <option value="RPG">RPG</option>
          <option value="Horror">Horror</option>
        </select>
      </div>

      {/* Table view */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>Publisher</th>
              <th>Genre</th>
              <th>Status</th>
              <th>Enabled</th>
              <th>Sessions</th>
              <th>Views</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="games-tbody">
            {games.length > 0 ? (
              games.map((g, index) => {
                const isApproved = g.status === 'approved';
                const isPending = g.status === 'pending';
                const isEnabled = Boolean(g.enabled);
                const viewsFormatted = (Number(g.views || 0) / 1000).toFixed(1) + 'K';

                return (
                  <tr key={g.id || g.game_id || index}>
                    {/* Game Column */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <GameIcon game={g} size="40px" index={index} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{g.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {g.players} players
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Publisher Column */}
                    <td style={{ fontSize: '0.82rem' }}>{g.publisher}</td>

                    {/* Genre Column */}
                    <td>
                      <span className="tag">{g.genre}</span>
                    </td>

                    {/* Status Column */}
                    <td>
                      <StatusBadge status={g.status} />
                    </td>

                    {/* Enabled Column */}
                    <td>
                      {isApproved ? (
                        isEnabled ? (
                          <span className="badge badge-enabled">Enabled</span>
                        ) : (
                          <span className="badge badge-disabled">Blacklisted</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Sessions Column */}
                    <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{g.sessions}</td>

                    {/* Views Column */}
                    <td style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{viewsFormatted}</td>

                    {/* Actions Column */}
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onView(g)}
                          title="View Details"
                        >
                          👁
                        </button>
                        {isPending && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onReview(g)}
                            title="Open the build review console"
                          >
                            🔍 Review
                          </button>
                        )}
                        {isApproved && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => onToggle(g)}
                          >
                            {isEnabled ? '⛔ Blacklist' : '✅ Enable'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-red btn-sm"
                          onClick={() => onDelete(g)}
                          title="Delete Game"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No games found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GamesTable;
