import React, { useState } from 'react';

export function PublisherGameEdit({
  game,
  genres = [],
  onSave,
  onCancel,
  onDelete,
  isSaving = false
}) {
  const parts = (game.players || '2-8').split('-').map((s) => s.trim());

  const [title, setTitle] = useState(game.game_name || game.title || '');
  const [titleError, setTitleError] = useState('');
  const [description, setDescription] = useState(game.desc || '');
  const [descriptionError, setDescriptionError] = useState('');
  const [genre, setGenre] = useState(game.game_type || game.genre || (genres[0] || 'FPS'));
  const [minPlayers, setMinPlayers] = useState(String(parts[0] || '2'));
  const [maxPlayers, setMaxPlayers] = useState(String(parts[1] || '8'));
  const [enabled, setEnabled] = useState(game.game_status === 'enabled' || !!game.enabled);
  const [maintenance, setMaintenance] = useState(!!game.maintenance);

  const isSelfHosted = (game.hosting_type || game.hostingType) === 'selfhosted';
  const gameUrl = game.game_url || game.gameUrl || '';

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (isSaving) return;

    let valid = true;
    const t = title.trim();
    const d = description.trim();

    if (!t) {
      setTitleError('Title required');
      valid = false;
    } else if (t.length < 3) {
      setTitleError('Min 3 characters');
      valid = false;
    } else {
      setTitleError('');
    }

    if (!d) {
      setDescriptionError('Description required');
      valid = false;
    } else if (d.length < 10) {
      setDescriptionError('Min 10 characters');
      valid = false;
    } else {
      setDescriptionError('');
    }

    if (!valid) return;

    onSave({
      title: t,
      description: d,
      genre,
      minPlayers,
      maxPlayers,
      enabled,
      maintenance
    });
  }

  return (
    <div className="edit-shell">
      {/* Game Information Panel */}
      <div className="edit-panel">
        <div className="edit-panel-title">Game Information</div>
        <div className="edit-panel-sub">Update your game's details and settings</div>

        <div className="form-group">
          <label className="form-label" htmlFor="ev-title">
            Game Title <span className="required">*</span>
          </label>
          <input
            id="ev-title"
            className="form-input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
            placeholder="Enter your game's title"
          />
          {titleError && <span className="form-error">{titleError}</span>}
        </div>

        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <label className="form-label" htmlFor="ev-desc">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="ev-desc"
            className="form-textarea"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (descriptionError) setDescriptionError('');
            }}
            placeholder="Describe what players can expect…"
            style={{ minHeight: '100px' }}
          />
          {descriptionError && <span className="form-error">{descriptionError}</span>}
        </div>

        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <label className="form-label" htmlFor="ev-genre">
            Genre <span className="required">*</span>
          </label>
          <select
            id="ev-genre"
            className="form-select"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="edit-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="ev-min">
              Min Players <span className="required">*</span>
            </label>
            <select
              id="ev-min"
              className="form-select"
              value={minPlayers}
              onChange={(e) => setMinPlayers(e.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ev-max">
              Max Players <span className="required">*</span>
            </label>
            <select
              id="ev-max"
              className="form-select"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
            >
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="12">12</option>
              <option value="16">16</option>
              <option value="32">32</option>
              <option value="64">64</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Game Status & Settings */}
        <div className="status-box">
          <div className="status-box-title">Game Status & Settings</div>

          <div className="toggle-row">
            <div>
              <div className="toggle-lbl">Enable / Disable Game</div>
              <div className="toggle-sub">Control whether players can access this game</div>
            </div>
            <label className="tog">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="tog-slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div className="toggle-lbl" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>⚠️</span> Maintenance Mode
              </div>
              <div className="toggle-sub">Show a maintenance message to players</div>
            </div>
            <label className="tog">
              <input
                type="checkbox"
                checked={maintenance}
                onChange={(e) => setMaintenance(e.target.checked)}
              />
              <span className="tog-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Hosting Configuration (Read-only) */}
      <div className="edit-panel">
        <div className="edit-panel-title">Hosting Configuration</div>
        <div className="edit-panel-sub">Your current hosting mode for this game</div>

        {isSelfHosted ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem',
              background: 'rgba(245,158,11,.05)',
              border: '1px solid rgba(245,158,11,.2)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🔧</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Self-Hosted Game</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {gameUrl || 'No URL set'}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem',
              background: 'rgba(0,212,255,.05)',
              border: '1px solid rgba(0,212,255,.2)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🏠</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Hosted on PlayCarys</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Your game runs on our servers with automatic scaling
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="edit-panel" style={{ padding: '1.5rem' }}>
        <div className="edit-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-save"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <button
          type="button"
          className="btn-del"
          onClick={onDelete}
          disabled={isSaving}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
          Delete Game
        </button>
      </div>
    </div>
  );
}

export default PublisherGameEdit;
