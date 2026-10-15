import React from 'react';
import { formatInr } from '../../../services/superuserService';

export function SuperuserPlatformMoney(props) {
  const { money, loading, error } = props;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3>💰 Money</h3>
        <span className="pf-note" id="pf-basis">
          {money?.inflow?.transaction_count != null
            ? `${money.inflow.transaction_count} completed transactions`
            : ''}
        </span>
      </div>

      {loading && <div id="pf-money" className="pf-loading">Loading…</div>}

      {!loading && error && (
        <div id="pf-money" className="pf-loading">Could not load platform figures.</div>
      )}

      {!loading && !error && money && (
        <div id="pf-money">
          <div className="pf-headline">
            <div>
              <div className="pf-big pf-in">{money.inflow.total_display}</div>
              <div className="pf-cap">Total inflow</div>
            </div>
            <div>
              <div className="pf-big pf-out">{money.outflow.paid_display}</div>
              <div className="pf-cap">Paid out</div>
            </div>
          </div>

          <div className="pf-rows">
            <div className="pf-row">
              <span>Subscriptions</span>
              <b>{formatInr(money.inflow.subscriptions_paise)}</b>
            </div>
            <div className="pf-row">
              <span>Cosmetics</span>
              <b>{formatInr(money.inflow.cosmetics_paise)}</b>
            </div>
            <div className="pf-row">
              <span>Tournament entries</span>
              <b>{formatInr(money.inflow.tournament_entries_paise)}</b>
            </div>
            <div className="pf-row">
              <span>Retained by platform</span>
              <b className="strong">{money.retained_display}</b>
            </div>
            <div className="pf-row">
              <span>Owed to studios</span>
              <b className="warn">{money.liability?.owed_to_studios_display}</b>
            </div>
            <div className="pf-row">
              <span>
                Carys float ({money.liability?.carys_outstanding?.toLocaleString('en-IN') ?? 0})
              </span>
              <b>{money.liability?.carys_value_display}</b>
            </div>
          </div>

          <div className="pf-foot">
            Publisher share {money.share_pct}% · minimum payout {money.min_payout_display} ·{' '}
            {money.outflow.payout_count} payout
            {money.outflow.payout_count === 1 ? '' : 's'} recorded
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperuserPlatformMoney;
