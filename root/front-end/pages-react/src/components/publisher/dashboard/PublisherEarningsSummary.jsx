import React from 'react';
import { useNavigate } from 'react-router-dom';
import Money from '../../../utils/money';

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
          <div className="earn-big">{Money.formatINR(earningsData.available_paise)}</div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.6rem'
            }}
          >
            Available to withdraw
          </div>
          <div className="earn-row">
            <span>In transit</span>
            <b>{Money.formatINR(earningsData.in_transit_paise)}</b>
          </div>
          <div className="earn-row">
            <span>Paid out</span>
            <b>{Money.formatINR(earningsData.paid_out_paise)}</b>
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
            {earningsData.withdraw?.can_withdraw ? 'Withdraw →' : 'Open earnings →'}
          </button>
        </div>
      )}
    </div>
  );
}

export default PublisherEarningsSummary;
