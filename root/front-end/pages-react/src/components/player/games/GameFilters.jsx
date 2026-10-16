import React from 'react';

export function GameFilters({
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  sortBy,
  onSortChange,
  genres = [],
  showingFavs,
  favCount,
  onToggleFavView
}) {
  return (
    <div className="game-filters-wrapper">
      <div
        className="page-header-row mb-2"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontFamily: "'Orbitron', monospace",
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '0.3rem'
            }}
          >
            Game Catalog
          </h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.88rem' }}>
            Browse games — press Play Now to start, or tap a game to see its details and achievements
          </p>
        </div>

        <button
          className={`btn btn-ghost btn-sm ${showingFavs ? 'active' : ''}`}
          id="fav-btn"
          onClick={onToggleFavView}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: showingFavs ? '1px solid #ec4899' : '1px solid var(--border-primary)',
            background: showingFavs ? 'rgba(236, 72, 153, 0.18)' : 'transparent',
            color: showingFavs ? '#f472b6' : 'inherit',
            fontWeight: showingFavs ? 700 : 'normal',
            padding: '0.45rem 0.9rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all var(--trans-fast)'
          }}
        >
          {showingFavs ? (
            '← Back to Games'
          ) : (
            <>
              <span style={{ color: '#ec4899' }}>♥</span> Favourites (<span id="fav-count">{favCount}</span>)
            </>
          )}
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-wrap" style={{ flex: 1, maxWidth: '400px' }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-input"
            id="search-input"
            placeholder="Search games or genre…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          id="genre-filter"
          value={selectedGenre}
          onChange={(e) => onGenreChange(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          id="sort-filter"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="rating">Top Rated</option>
          <option value="views">Most Viewed</option>
          <option value="newest">Newest</option>
        </select>
      </div>
    </div>
  );
}

export default GameFilters;
