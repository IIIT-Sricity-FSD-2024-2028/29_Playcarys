import React from 'react';

export function BasicInfoStep({
  title,
  onChangeTitle,
  titleError,
  description,
  onChangeDescription,
  descriptionError,
  genres = [],
  selectedGenre,
  onSelectGenre,
  genreError,
  onBack,
  onNext
}) {
  return (
    <div id="step-1">
      <div className="pub-section">
        <h3 style={{ marginBottom: '0.3rem' }}>📋 Basic Information</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Tell players what your game is about
        </p>

        <div className="form-fields">
          <div className="form-group">
            <label className="form-label">
              Game Title <span className="required">*</span>
            </label>
            <input
              className={`form-input ${titleError ? 'error' : ''}`}
              id="f-title"
              placeholder="Enter game title (3–60 characters)"
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
            />
            {titleError && (
              <span className="form-error show" style={{ display: 'block' }}>
                {titleError}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Description <span className="required">*</span>
            </label>
            <textarea
              className={`form-textarea ${descriptionError ? 'error' : ''}`}
              id="f-desc"
              placeholder="Describe your game (20–500 characters)…"
              style={{ minHeight: '110px' }}
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-error show" style={{ display: descriptionError ? 'block' : 'none' }}>
                {descriptionError}
              </span>
              <span className="form-hint" id="desc-count">
                {description.length} / 500
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Genre <span className="required">*</span>
            </label>
            <div className="genre-grid" id="genre-grid">
              {genres.map((g) => (
                <div
                  key={g}
                  className={`genre-chip ${selectedGenre === g ? 'selected' : ''}`}
                  onClick={() => onSelectGenre(g)}
                >
                  {g}
                </div>
              ))}
            </div>
            {genreError && (
              <span className="form-error show" id="genre-error" style={{ display: 'block', marginTop: '0.35rem' }}>
                {genreError}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pub-nav">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Next — Game Details →
        </button>
      </div>
    </div>
  );
}

export default BasicInfoStep;
