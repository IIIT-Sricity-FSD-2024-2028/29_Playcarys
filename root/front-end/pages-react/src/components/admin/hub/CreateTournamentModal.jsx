/*
 * Concepts used in this component:
 *  - Components, Props (open, games, form, errors, handlers), Forms (controlled inputs, a dropdown
 *    filled from the approved games, and validation messages), Lists (game options), Events,
 *    Hooks (useEffect), Callbacks
 *
 * The "🏆 Create Tournament" dialog of the old hub.html (#create-tournament-modal).
 */
import React, { useEffect } from 'react';

export function CreateTournamentModal(props) {
  const { open, games, form, errors, minDate, onFieldChange, onClose, onCreate } = props;

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={'modal-overlay' + (open ? ' show' : '')} id="create-tournament-modal" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h3 className="modal-title">🏆 Create Tournament</h3>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Tournament Name <span className="required">*</span></label>
            <input
              className={'form-input' + (errors.name ? ' error' : '')}
              id="ct-name"
              placeholder="e.g. Grand Masters Championship"
              value={form.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
            />
            <span className={'form-error' + (errors.name ? ' show' : '')}>{errors.name}</span>
          </div>
          <div className="form-group">
            <label className="form-label">Description <span className="required">*</span></label>
            <textarea
              className={'form-textarea' + (errors.desc ? ' error' : '')}
              id="ct-desc"
              placeholder="Describe this tournament..."
              value={form.desc}
              onChange={(e) => onFieldChange('desc', e.target.value)}
              style={{ minHeight: '80px' }}
            ></textarea>
            <span className={'form-error' + (errors.desc ? ' show' : '')}>{errors.desc}</span>
          </div>
          <div className="cards-grid-2">
            <div className="form-group">
              <label className="form-label">Game <span className="required">*</span></label>
              <select className="form-select" id="ct-game" value={form.gameId} onChange={(e) => onFieldChange('gameId', e.target.value)}>
                {games.map((g) => <option value={g.id} key={g.id}>{g.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Participants <span className="required">*</span></label>
              <input
                className={'form-input' + (errors.max ? ' error' : '')}
                id="ct-max"
                type="number"
                min="4"
                max="1024"
                value={form.max}
                onChange={(e) => onFieldChange('max', e.target.value)}
              />
              <span className={'form-error' + (errors.max ? ' show' : '')}>{errors.max}</span>
            </div>
          </div>
          <div className="cards-grid-2">
            <div className="form-group">
              <label className="form-label">Start Date <span className="required">*</span></label>
              <input
                className={'form-input' + (errors.start ? ' error' : '')}
                id="ct-start"
                type="date"
                min={minDate}
                value={form.start}
                onChange={(e) => onFieldChange('start', e.target.value)}
              />
              <span className={'form-error' + (errors.start ? ' show' : '')}>{errors.start}</span>
            </div>
            <div className="form-group">
              <label className="form-label">Prize Pool</label>
              <input
                className="form-input"
                id="ct-prize"
                placeholder="e.g. $500"
                value={form.prize}
                onChange={(e) => onFieldChange('prize', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-purple" onClick={onCreate}>🏆 Create Tournament</button>
        </div>
      </div>
    </div>
  );
}

export default CreateTournamentModal;
