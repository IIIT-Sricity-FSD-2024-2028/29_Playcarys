import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../app/hooks';
import { setCreateTournamentStep, setTournamentFilters } from '../../../features/tournaments/tournamentSlice';
import { KIND_LABEL } from '../../../services/tournamentService';

export function TournamentFilters({ kindFilter = 'all', onSelectKind, onOpenJoinById }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const kinds = ['all', 'official', 'casual', 'community'];

  return (
    <div className="tournament-filters-wrap">
      <div className="page-header-row" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.3rem', fontSize: '1.8rem', fontFamily: "'Orbitron', monospace", color: '#fff' }}>
            Tournaments
          </h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
            Official events, casual pickup games, and your groups' community tournaments
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenJoinById();
            }}
            type="button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
          >
            🎯 Join by ID
          </button>
          <button
            className="btn btn-yellow"
            onClick={() => {
              dispatch(setCreateTournamentStep(1));
              navigate('/player/create-tournament');
            }}
            type="button"
          >
            🏆 Create Tournament
          </button>
        </div>
      </div>
      <div className="kind-filter-row" id="kind-filter-row">
        {kinds.map((k) => (
          <button
            key={k}
            className={`kind-filter-tab ${kindFilter === k ? 'active' : ''}`}
            onClick={() => {
              dispatch(setTournamentFilters({ kindFilter: k }));
              onSelectKind(k);
            }}
            type="button"
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TournamentFilters;
