import React,{useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { KIND_LABEL } from '../../../services/tournamentService';

export function TournamentFilters({ kindFilter = 'all', onSelectKind }) {
  const navigate = useNavigate();
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
        <button
          className="btn btn-yellow"
          onClick={() => {
            navigate('/player/create-tournament');
          }}
          type="button"
        >
          🏆 Create Tournament
        </button>
      </div>

      <div className="kind-filter-row" id="kind-filter-row">
        {kinds.map((k) => (
          <button
            key={k}
            className={`kind-filter-tab ${kindFilter === k ? 'active' : ''}`}
            onClick={() => onSelectKind(k)}
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
