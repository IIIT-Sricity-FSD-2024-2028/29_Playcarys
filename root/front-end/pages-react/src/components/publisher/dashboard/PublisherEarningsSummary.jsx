import React from 'react';
import { useNavigate } from 'react-router-dom';

export function PublisherEarningsSummary(props) {
  const { earningsData, loading, error } = props;
  const navigate = useNavigate();

  function handleOpenEarnings() {
    navigate('/publisher/earnings');
  }

  return (
    <div className="card">
      <h3 className="side-h">💰 Earnings</h3>

      {loading && <div className="side-loading">Loading…</div>}

      {!loading && error && (
        <div className="side-loading">Earnings unavailable right now.</div>
      )}

      {!loading && !error && earningsData && (
        <div>
          <div className="earn-big">{earningsData.balance_display || '₹0'}</div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.6rem'
            }}
          >
            Available to pay out
          </div>
          <div className="earn-row">
            <span>This period</span>
            <b>{earningsData.unsettled?.net_display || '₹0'}</b>
          </div>
          <div className="earn-row">
            <span>Your share</span>
            <b>{earningsData.share_pct ?? 70}%</b>
          </div>
          <div className="earn-row">
            <span>Minimum payout</span>
            <b>{earningsData.min_payout_display || '—'}</b>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', marginTop: '0.7rem' }}
            onClick={handleOpenEarnings}
          >
            Open earnings →
          </button>
        </div>
      )}
    </div>
  );
}

export default PublisherEarningsSummary;
