import React from 'react';
import { getGameVisualInfo } from '../../../services/publisherService';

const STEPS = ['Type', 'Select Game(s)', 'League Details', 'Schedule'];

export function TournamentEditor({
  editId,
  currentStep,
  selectedType,
  onSelectType,
  selectedVisibility,
  onSelectVisibility,
  // Single game
  approvedGames = [],
  selectedGameId,
  onSelectGame,
  gameError,
  // Multi game stages
  stages = [],
  onAddStage,
  onUpdateStage,
  onRemoveStage,
  stageError,
  // League details
  name,
  onChangeName,
  nameError,
  description,
  onChangeDescription,
  descriptionError,
  prize,
  onChangePrize,
  prizeError,
  maxPlayers,
  onChangeMaxPlayers,
  maxPlayersError,
  // Schedule
  regDeadline,
  onChangeRegDeadline,
  regDeadlineError,
  startDate,
  onChangeStartDate,
  startDateError,
  endDate,
  onChangeEndDate,
  endDateError,
  dateOrderError,
  // Nav
  onNextStep,
  onPrevStep,
  onSubmit,
  onCancel
}) {
  return (
    <div className="pub-shell">
      <div className="back-row" onClick={onCancel}>
        ← Cancel &amp; Back to Hub
      </div>

      <div className="pub-header">
        <h1 id="editor-title">
          {editId ? 'Edit Tournament' : 'Publish Tournament'}
        </h1>
        <p className="text-muted" id="editor-sub">
          Configure your rules and schedule
        </p>
      </div>

      {/* Step Rail */}
      <div className="step-rail" id="step-rail">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const cls = isDone ? 'done' : isActive ? 'active' : '';
          const lineClass = isDone ? 'done' : '';
          const circle = isDone ? '✓' : stepNum;

          return (
            <React.Fragment key={label}>
              <div className={`step-node ${cls}`}>
                <div className="step-circle">{circle}</div>
                <div className="step-label">{label}</div>
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${lineClass}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Type & Visibility ──────────────────── */}
      {currentStep === 1 && (
        <div id="step-1">
          <div className="pub-section">
            <h3 style={{ marginBottom: '0.3rem' }}>🧭 Tournament Type</h3>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: 0
              }}
            >
              Single-game leagues run entirely on this page, as before. Multi-game fests span several of your games and
              post live to PlayCarys' real tournament engine.
            </p>

            <div className="toggle-row">
              <div
                className={`toggle-opt ${selectedType === 'single' ? 'selected' : ''}`}
                id="type-single"
                onClick={() => onSelectType('single')}
              >
                <div className="t-icon">🎮</div>
                <div className="t-title">Single-Game</div>
                <div className="t-sub">One game, bracket or score board</div>
              </div>
              <div
                className={`toggle-opt ${selectedType === 'multi' ? 'selected' : ''}`}
                id="type-multi"
                onClick={() => onSelectType('multi')}
              >
                <div className="t-icon">🏅</div>
                <div className="t-title">Multi-Game Fest</div>
                <div className="t-sub">Several games, combined into one leaderboard</div>
              </div>
            </div>

            <h3 style={{ margin: '1.5rem 0 0.3rem' }}>👁️ Visibility</h3>
            <div className="toggle-row">
              <div
                className={`toggle-opt ${selectedVisibility === 'public' ? 'selected' : ''}`}
                id="vis-public"
                onClick={() => onSelectVisibility('public')}
              >
                <div className="t-icon">🌐</div>
                <div className="t-title">Public</div>
                <div className="t-sub">Anyone can find and join it</div>
              </div>
              <div
                className={`toggle-opt ${selectedVisibility === 'private' ? 'selected' : ''}`}
                id="vis-private"
                onClick={() => onSelectVisibility('private')}
              >
                <div className="t-icon">🔒</div>
                <div className="t-title">Private / Invite-Only</div>
                <div className="t-sub">Hidden from browse; needs an invite code</div>
              </div>
            </div>
          </div>

          <div className="pub-nav">
            <div />
            <button className="btn btn-primary btn-lg" onClick={() => onNextStep(1)}>
              Next — Select Game(s) →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Select Game(s) ─────────────────────── */}
      {currentStep === 2 && (
        <div id="step-2">
          {selectedType === 'single' ? (
            <div className="pub-section" id="single-game-section">
              <h3 style={{ marginBottom: '0.3rem' }}>🎮 Select Game</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
                Pick one of your approved games for this tournament
              </p>
              <div className="game-select-grid" id="game-list">
                {approvedGames.length > 0 ? (
                  approvedGames.map((g, i) => {
                    const gid = String(g.id || g.game_id);
                    const isSelected = selectedGameId === gid;
                    const visual = getGameVisualInfo(g, i);

                    return (
                      <div
                        key={gid}
                        className={`game-opt ${isSelected ? 'selected' : ''}`}
                        id={`gopt-${gid}`}
                        onClick={() => onSelectGame(gid)}
                      >
                        <div
                          style={{
                            width: '50px',
                            height: '55px',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '0.3rem',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: visual.bgColor
                          }}
                        >
                          {visual.imgSrc ? (
                            <img
                              src={visual.imgSrc}
                              alt={visual.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.6rem' }}>{visual.emoji}</span>
                          )}
                        </div>
                        <div className="game-opt-name">{g.game_name || g.title}</div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      gridColumn: '1/-1',
                      textAlign: 'center',
                      padding: '2rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎮</div>
                    <p>No approved games yet.</p>
                  </div>
                )}
              </div>
              {gameError && (
                <span className="form-error show" id="game-error" style={{ marginTop: '0.75rem', display: 'block' }}>
                  {gameError}
                </span>
              )}
            </div>
          ) : (
            <div className="pub-section" id="multi-game-section">
              <h3 style={{ marginBottom: '0.3rem' }}>🏅 Build the Stage Order</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Each stage is one of your games. Players earn points per stage (by finishing position); the overall
                winner has the highest total across all stages.
              </p>

              <div id="stage-list">
                {stages.length > 0 ? (
                  stages.map((s, i) => (
                    <div key={s.rowId || i} className="stage-row">
                      <div className="stage-order-badge">{i + 1}</div>
                      <div className={`stage-fields ${s.format === 'score' ? 'score-fields' : ''}`}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>
                            Game
                          </label>
                          <select
                            className="form-input"
                            value={s.game_id}
                            onChange={(e) => onUpdateStage(s.rowId, 'game_id', e.target.value)}
                          >
                            {approvedGames.map((g) => (
                              <option key={g.id || g.game_id} value={String(g.id || g.game_id)}>
                                {g.game_name || g.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>
                            Format
                          </label>
                          <select
                            className="form-input"
                            value={s.format}
                            onChange={(e) => onUpdateStage(s.rowId, 'format', e.target.value)}
                          >
                            <option value="score">Score board</option>
                            <option value="bracket">Knockout bracket</option>
                          </select>
                        </div>

                        {s.format === 'score' && (
                          <>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.72rem' }}>
                                Metric Label
                              </label>
                              <input
                                className="form-input"
                                value={s.metric_label || ''}
                                onChange={(e) => onUpdateStage(s.rowId, 'metric_label', e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.72rem' }}>
                                Direction
                              </label>
                              <select
                                className="form-input"
                                value={s.direction || 'high'}
                                onChange={(e) => onUpdateStage(s.rowId, 'direction', e.target.value)}
                              >
                                <option value="high">Higher is better</option>
                                <option value="low">Lower is better</option>
                              </select>
                            </div>
                          </>
                        )}

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>
                            Points Weight
                          </label>
                          <input
                            className="form-input"
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={s.points_weight}
                            onChange={(e) => onUpdateStage(s.rowId, 'points_weight', e.target.value)}
                          />
                        </div>
                      </div>

                      <div
                        className="stage-remove"
                        onClick={() => onRemoveStage(s.rowId)}
                        title="Remove stage"
                      >
                        ✕
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted" style={{ padding: '0.5rem 0' }}>
                    No stages yet — add at least two.
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onAddStage}
                style={{ marginTop: '0.5rem' }}
              >
                + Add Stage
              </button>

              {stageError && (
                <span className="form-error show" id="stage-error" style={{ marginTop: '0.75rem', display: 'block' }}>
                  {stageError}
                </span>
              )}
            </div>
          )}

          <div className="pub-nav">
            <button className="btn btn-ghost" onClick={() => onPrevStep(2)}>
              ← Back
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => onNextStep(2)}>
              Next — League Details →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Details ────────────────────────────── */}
      {currentStep === 3 && (
        <div id="step-3">
          <div className="pub-section">
            <h3 style={{ marginBottom: '0.3rem' }}>🏆 League Details</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Name your event and set the prize pool
            </p>

            <div className="form-fields">
              <div className="form-group">
                <label className="form-label">
                  Tournament Name <span className="required">*</span>
                </label>
                <input
                  className={`form-input ${nameError ? 'error' : ''}`}
                  id="t-name"
                  placeholder="e.g. Winter Grandmaster Open"
                  value={name}
                  onChange={(e) => onChangeName(e.target.value)}
                />
                {nameError && (
                  <span className="form-error show" style={{ display: 'block' }}>
                    {nameError}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Rules &amp; Description <span className="required">*</span>
                </label>
                <textarea
                  className={`form-textarea ${descriptionError ? 'error' : ''}`}
                  id="t-desc"
                  placeholder="Explain the scoring, format and professional rules…"
                  style={{ minHeight: '110px' }}
                  value={description}
                  onChange={(e) => onChangeDescription(e.target.value)}
                />
                {descriptionError && (
                  <span className="form-error show" style={{ display: 'block' }}>
                    {descriptionError}
                  </span>
                )}
              </div>

              <div className="form-2col">
                <div className="form-group">
                  <label className="form-label">
                    Prize Pool <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input ${prizeError ? 'error' : ''}`}
                    id="t-prize"
                    placeholder="e.g. ₹50,000 or $5,000"
                    value={prize}
                    onChange={(e) => onChangePrize(e.target.value)}
                  />
                  {prizeError && (
                    <span className="form-error show" style={{ display: 'block' }}>
                      {prizeError}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Max Players <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input ${maxPlayersError ? 'error' : ''}`}
                    id="t-max"
                    type="number"
                    placeholder="e.g. 32"
                    value={maxPlayers}
                    onChange={(e) => onChangeMaxPlayers(e.target.value)}
                  />
                  {maxPlayersError && (
                    <span className="form-error show" style={{ display: 'block' }}>
                      {maxPlayersError}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pub-nav">
            <button className="btn btn-ghost" onClick={() => onPrevStep(3)}>
              ← Back
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => onNextStep(3)}>
              Next — Schedule →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Schedule ───────────────────────────── */}
      {currentStep === 4 && (
        <div id="step-4">
          <div className="pub-section">
            <h3 style={{ marginBottom: '0.3rem' }}>📅 Scheduling</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Set your registration deadline and tournament window
            </p>

            <div className="form-fields">
              <div className="form-group">
                <label className="form-label">
                  Registration Deadline <span className="required">*</span>
                </label>
                <input
                  className={`form-input ${regDeadlineError ? 'error' : ''}`}
                  id="t-regclose"
                  type="date"
                  value={regDeadline}
                  onChange={(e) => onChangeRegDeadline(e.target.value)}
                />
                {regDeadlineError && (
                  <span className="form-error show" style={{ display: 'block' }}>
                    {regDeadlineError}
                  </span>
                )}
              </div>

              <div className="form-2col">
                <div className="form-group">
                  <label className="form-label">
                    Start Date <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input ${startDateError ? 'error' : ''}`}
                    id="t-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => onChangeStartDate(e.target.value)}
                  />
                  {startDateError && (
                    <span className="form-error show" style={{ display: 'block' }}>
                      {startDateError}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    End Date <span className="required">*</span>
                  </label>
                  <input
                    className={`form-input ${endDateError ? 'error' : ''}`}
                    id="t-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => onChangeEndDate(e.target.value)}
                  />
                  {endDateError && (
                    <span className="form-error show" style={{ display: 'block' }}>
                      {endDateError}
                    </span>
                  )}
                </div>
              </div>

              {dateOrderError && (
                <span className="form-error show" style={{ display: 'block' }}>
                  {dateOrderError}
                </span>
              )}
            </div>

            {selectedVisibility === 'private' && (
              <div className="invite-code-box" id="invite-code-preview">
                🔒 This is a private tournament. A join code will be generated on publish, shown to you on the next
                screen — share it with whoever you want to invite.
              </div>
            )}
          </div>

          <div className="pub-nav">
            <button className="btn btn-ghost" onClick={() => onPrevStep(4)}>
              ← Back
            </button>
            <button
              className="btn btn-green btn-lg"
              id="submit-btn"
              onClick={onSubmit}
            >
              {editId ? '💾 Save Changes' : '🏆 Publish Tournament'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentEditor;
