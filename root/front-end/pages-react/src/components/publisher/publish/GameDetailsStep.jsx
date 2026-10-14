import React, { useRef } from 'react';
import JSZip from 'jszip';

export function GameDetailsStep({
  minPlayers,
  onChangeMinPlayers,
  minError,
  maxPlayers,
  onChangeMaxPlayers,
  maxError,
  gameMode,
  onChangeGameMode,
  ageRating,
  onChangeAgeRating,
  tournamentFormat,
  onChangeTournamentFormat,
  thumbnailDataUrl,
  onThumbnailSelected,
  thumbError,
  maxCarys,
  onChangeMaxCarys,
  maxCarysError,
  achievements,
  onAddAchievement,
  onUpdateAchievement,
  onRemoveAchievement,
  hostingMode,
  zipFile,
  zipFileName,
  isZipValid,
  zipError,
  onZipValidated,
  gameUrl,
  onChangeGameUrl,
  gameUrlError,
  webhookUrl,
  onChangeWebhookUrl,
  apiKey,
  onCopyApiKey,
  onBack,
  onNext
}) {
  const thumbInputRef = useRef(null);
  const zipInputRef = useRef(null);

  function handleThumbChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      onThumbnailSelected(loadEvent.target?.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleZipChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      onZipValidated(null, '', false, '');
      return;
    }

    onZipValidated(file, `Validating ${file.name}...`, false, '');

    try {
      const zip = await JSZip.loadAsync(file);
      let hasIndexHtml = false;
      let hasSuspiciousFile = false;

      const suspiciousExts = ['.exe', '.bat', '.cmd', '.sh', '.dll', '.msi', '.vbs', '.php'];

      zip.forEach((relativePath) => {
        const lower = relativePath.toLowerCase();
        if (lower.endsWith('index.html')) {
          hasIndexHtml = true;
        }

        const dotIndex = lower.lastIndexOf('.');
        if (dotIndex !== -1) {
          const ext = lower.substring(dotIndex);
          if (suspiciousExts.includes(ext)) {
            hasSuspiciousFile = true;
          }
        }
      });

      if (hasSuspiciousFile) {
        onZipValidated(
          null,
          file.name,
          false,
          'Error: Security warning! ZIP contains suspicious executable files (.exe, .bat, etc).'
        );
        if (zipInputRef.current) zipInputRef.current.value = '';
        return;
      }

      if (!hasIndexHtml) {
        onZipValidated(
          null,
          file.name,
          false,
          'Error: No index.html found. The ZIP must contain an HTML5 game entry point.'
        );
        if (zipInputRef.current) zipInputRef.current.value = '';
        return;
      }

      onZipValidated(file, `${file.name} (Verified HTML5 Game ✅)`, true, '');
    } catch (err) {
      onZipValidated(
        null,
        file.name,
        false,
        'Error: Invalid ZIP archive. Could not parse contents.'
      );
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  }

  return (
    <div id="step-2">
      <div className="pub-section">
        <h3 style={{ marginBottom: '0.3rem' }}>⚙️ Game Details</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Configure game settings and visuals
        </p>

        <div className="form-fields">
          <div className="form-2col">
            <div className="form-group">
              <label className="form-label">
                Min Players <span className="required">*</span>
              </label>
              <input
                className={`form-input ${minError ? 'error' : ''}`}
                id="f-min"
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 1"
                value={minPlayers}
                onChange={(e) => onChangeMinPlayers(e.target.value)}
              />
              {minError && (
                <span className="form-error show" style={{ display: 'block' }}>
                  {minError}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Max Players <span className="required">*</span>
              </label>
              <input
                className={`form-input ${maxError ? 'error' : ''}`}
                id="f-max"
                type="number"
                min="1"
                max="1000"
                placeholder="e.g. 64"
                value={maxPlayers}
                onChange={(e) => onChangeMaxPlayers(e.target.value)}
              />
              {maxError && (
                <span className="form-error show" style={{ display: 'block' }}>
                  {maxError}
                </span>
              )}
            </div>
          </div>

          <div className="form-2col">
            <div className="form-group">
              <label className="form-label">Game Mode</label>
              <select
                className="form-select"
                id="f-mode"
                value={gameMode}
                onChange={(e) => onChangeGameMode(e.target.value)}
              >
                <option value="Multiplayer">Multiplayer</option>
                <option value="Battle Royale">Battle Royale</option>
                <option value="Co-op">Co-op</option>
                <option value="Competitive">Competitive</option>
                <option value="Single Player">Single Player</option>
                <option value="Casual">Casual</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Age Rating</label>
              <select
                className="form-select"
                id="f-age"
                value={ageRating}
                onChange={(e) => onChangeAgeRating(e.target.value)}
              >
                <option value="Everyone">Everyone (E)</option>
                <option value="Teen">Teen (T)</option>
                <option value="Mature">Mature (M)</option>
                <option value="Adults Only">Adults Only (AO)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Tournament Format{' '}
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                (optional)
              </span>
            </label>
            <select
              className="form-select"
              id="f-tournamentformat"
              value={tournamentFormat}
              onChange={(e) => onChangeTournamentFormat(e.target.value)}
            >
              <option value="0">Not Supported</option>
              <option value="2">1v1 (2 players per match)</option>
              <option value="4">Free-for-all (4 players per match)</option>
              <option value="8">Free-for-all (8 players per match)</option>
            </select>
            <span className="form-hint">
              Enables Bracket Tree Room logic when players select "Tournament" mode in your game lobbies.
            </span>
          </div>

          {/* Game Thumbnail */}
          <div className="form-group">
            <label className="form-label">
              Game Thumbnail <span className="required">*</span>
            </label>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div
                id="img-preview"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-secondary)',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                {thumbnailDataUrl ? (
                  <img
                    src={thumbnailDataUrl}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span id="preview-placeholder" style={{ fontSize: '3rem' }}>
                    🖼️
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  id="f-thumbnail-file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={thumbInputRef}
                  onChange={handleThumbChange}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => thumbInputRef.current?.click()}
                >
                  Select Image File
                </button>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.6rem',
                    lineHeight: 1.4
                  }}
                >
                  Upload a high-quality JPG, PNG, or WebP.
                  <br />
                  Optimal resolution: 500x500px.
                </p>
                {thumbError && (
                  <span
                    className="form-error show"
                    id="thumb-error"
                    style={{ display: 'block', marginTop: '0.4rem' }}
                  >
                    {thumbError}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Economy section */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(0, 212, 255, 0.05)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <h4 style={{ marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
            💡 Carys Points &amp; Match Rules
          </h4>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: '0 0 0.6rem'
            }}
          >
            By default PlayCarys awards points from the match outcome (win / draw / loss). Your game can set its own
            figure instead by passing <code>carys_earned</code> and <code>xp_gained</code> when it reports a result
            through the SDK:
          </p>
          <pre
            style={{
              fontSize: '0.72rem',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 0.75rem',
              margin: '0 0 0.6rem',
              overflowX: 'auto'
            }}
          >
            <code>PlayCarys.submitResult({`{ outcome: 'win', score: 4242, carys_earned: 80 }`});</code>
          </pre>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: 0
            }}
          >
            Use the SDK — <code>DB.recordMatchResult()</code> is internal to the platform and is not reachable from a
            game. Whatever your game reports is capped by the ceiling you set below, so pick a number that reflects a
            genuinely good run.
          </p>
        </div>

        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <label className="form-label">
            Max Carys per match <span className="required">*</span>
          </label>
          <input
            className={`form-input ${maxCarysError ? 'error' : ''}`}
            id="f-maxcarys"
            type="number"
            min="0"
            max="1000"
            value={maxCarys}
            onChange={(e) => onChangeMaxCarys(e.target.value)}
          />
          <span className="form-hint">
            The most a single match of your game may award one player (0–1000). Reviewed before your game goes live.
          </span>
          {maxCarysError && (
            <span className="form-error show" style={{ display: 'block' }}>
              {maxCarysError}
            </span>
          )}
        </div>

        {/* Achievements section */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(139, 92, 246, 0.05)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '0.5rem'
            }}
          >
            <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-purple)' }}>
              🏅 Achievements{' '}
              <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>(optional)</span>
            </h4>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={onAddAchievement}
            >
              + Add
            </button>
          </div>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: '0 0 0.75rem'
            }}
          >
            Declare them here and unlock them from your game by <em>code</em> — the platform grants the reward and the
            title, once per player:
          </p>
          <pre
            style={{
              fontSize: '0.72rem',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 0.75rem',
              margin: '0 0 0.85rem',
              overflowX: 'auto'
            }}
          >
            <code>PlayCarys.unlockAchievement('first_win');</code>
          </pre>

          <div id="ach-rows">
            {achievements.map((ach, index) => (
              <div
                key={ach.id || index}
                className="ach-row"
                id={`ach-${ach.id || index}`}
                style={{
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  marginBottom: '0.65rem',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.1fr 1.6fr 70px',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}
                >
                  <input
                    className="form-input ach-code"
                    placeholder="first_win"
                    value={ach.code}
                    onChange={(e) => onUpdateAchievement(index, 'code', e.target.value)}
                    title="Code your game unlocks by"
                  />
                  <input
                    className="form-input ach-name"
                    placeholder="First Blood"
                    value={ach.name}
                    onChange={(e) => onUpdateAchievement(index, 'name', e.target.value)}
                    title="Shown to players"
                  />
                  <input
                    className="form-input ach-icon"
                    placeholder="🏆"
                    maxLength={4}
                    value={ach.icon}
                    onChange={(e) => onUpdateAchievement(index, 'icon', e.target.value)}
                    title="Emoji"
                  />
                </div>
                <input
                  className="form-input ach-desc"
                  placeholder="Win your first match."
                  value={ach.description}
                  onChange={(e) => onUpdateAchievement(index, 'description', e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1.4fr auto auto',
                    gap: '0.5rem',
                    alignItems: 'center'
                  }}
                >
                  <input
                    className="form-input ach-reward"
                    type="number"
                    min="0"
                    max="500"
                    value={ach.carys_reward}
                    onChange={(e) =>
                      onUpdateAchievement(index, 'carys_reward', parseInt(e.target.value, 10) || 0)
                    }
                    title="Carys granted once (max 500)"
                  />
                  <input
                    className="form-input ach-title"
                    placeholder="Title (optional)"
                    value={ach.title_awarded || ''}
                    onChange={(e) => onUpdateAchievement(index, 'title_awarded', e.target.value)}
                    title="Title the player can display"
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <input
                      type="checkbox"
                      className="ach-secret"
                      checked={!!ach.secret}
                      onChange={(e) => onUpdateAchievement(index, 'secret', e.target.checked)}
                    />{' '}
                    Secret
                  </label>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => onRemoveAchievement(index)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {achievements.length === 0 && (
            <div
              id="ach-empty"
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                textAlign: 'center',
                padding: '0.75rem 0'
              }}
            >
              No achievements yet — your game will still work fine without them.
            </div>
          )}
        </div>
      </div>

      {/* Hosted extra */}
      {hostingMode === 'hosted' && (
        <div
          className="pub-section"
          id="hosted-extra"
          style={{ borderColor: 'rgba(0,212,255,0.3)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <div>
              <h3 style={{ color: 'var(--accent-cyan)' }}>Game Logic Upload</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Upload your game's HTML5/JS assets in a single .zip archive
              </p>
            </div>
          </div>

          <div className="form-fields">
            <div className="form-group">
              <label className="form-label">
                Game Assets (ZIP) <span className="required">*</span>
              </label>
              <div
                style={{
                  border: '1px dashed var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <input
                  type="file"
                  id="f-gamefile"
                  accept=".zip"
                  style={{ display: 'none' }}
                  ref={zipInputRef}
                  onChange={handleZipChange}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => zipInputRef.current?.click()}
                >
                  Select .ZIP File
                </button>
                <div
                  id="file-name-display"
                  style={{
                    fontSize: '0.85rem',
                    color: isZipValid ? 'var(--accent-green)' : 'var(--accent-cyan)',
                    marginTop: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {zipFileName || 'No file selected'}
                </div>
                {zipError && (
                  <span
                    className="form-error show"
                    id="file-error"
                    style={{ display: 'block', marginTop: '0.4rem' }}
                  >
                    {zipError}
                  </span>
                )}
              </div>
              <span
                className="form-hint"
                style={{ display: 'block', textAlign: 'center', marginTop: '0.5rem' }}
              >
                Root folder must contain index.html. Max 50MB.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Self-Host extra */}
      {hostingMode === 'selfhosted' && (
        <div
          className="pub-section"
          id="selfhost-extra"
          style={{ borderColor: 'rgba(245,158,11,0.3)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🔧</span>
            <div>
              <h3 style={{ color: 'var(--accent-yellow)' }}>Self-Host Configuration</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Provide your server URLs so PlayCarys can link players to your game
              </p>
            </div>
          </div>

          <div className="form-fields">
            <div className="form-group">
              <label className="form-label">
                Game URL <span className="required">*</span>
              </label>
              <input
                className={`form-input ${gameUrlError ? 'error' : ''}`}
                id="f-gameurl"
                placeholder="https://yourgame.com/play"
                value={gameUrl}
                onChange={(e) => onChangeGameUrl(e.target.value)}
              />
              <span className="form-hint">
                The direct URL where players will be sent to play your game
              </span>
              {gameUrlError && (
                <span className="form-error show" style={{ display: 'block' }}>
                  {gameUrlError}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Webhook URL{' '}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  (optional)
                </span>
              </label>
              <input
                className="form-input"
                id="f-webhook"
                placeholder="https://yourgame.com/api/webhooks/playcarys"
                value={webhookUrl}
                onChange={(e) => onChangeWebhookUrl(e.target.value)}
              />
              <span className="form-hint">
                We'll POST events (player joins, score updates) to this URL
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Your PlayCarys API Key</label>
              <div className="api-block" onClick={onCopyApiKey}>
                <div id="api-key-display">{apiKey || 'pk_live_••••••••••••••••••••'}</div>
                <div className="copy-hint">Click to copy your API key</div>
              </div>
              <span className="form-hint">
                Use this key in the PlayCarys SDK to authenticate your server
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="pub-nav">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Review &amp; Submit →
        </button>
      </div>
    </div>
  );
}

export default GameDetailsStep;
