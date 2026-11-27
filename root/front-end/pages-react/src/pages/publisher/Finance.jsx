import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublisherAuth } from '../../hooks/usePublisherAuth';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { depositPublisherFunds, fetchPublisherFinance } from '../../features/economy/walletSlice';
import { withdrawPublisher } from '../../features/economy/payoutSlice';
import Money from '../../utils/money';
import LoadingState from '../../components/common/LoadingState';
import WithdrawModal from '../../components/publisher/earnings/WithdrawModal';
import '../../styles/publisher/earnings.css';

export function PublisherFinance() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isPublisher, authLoading } = usePublisherAuth();
  const publisherId = user?.userId || user?.id;
  const financeData = useAppSelector((state) => state.wallet?.publisherFinanceById?.[String(publisherId)] || null);
  const financeStatus = useAppSelector((state) => state.wallet?.publisherFinanceStatus);
  const financeError = useAppSelector((state) => state.wallet?.publisherFinanceError);
  const depositStatus = useAppSelector((state) => state.wallet?.publisherDepositStatus);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Deposit Form State
  const [depositRupees, setDepositRupees] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState('UPI Sandbox (GPay / PhonePe)');
  const [depositSuccess, setDepositSuccess] = useState(null);
  const [depositError, setDepositError] = useState(null);

  // Filter for Ledger
  const [ledgerFilter, setLedgerFilter] = useState('all');

  const loadFinance = useCallback(async (quiet = false) => {
    if (!isPublisher || !publisherId) return;
    await dispatch(fetchPublisherFinance(publisherId));
  }, [dispatch, isPublisher, publisherId]);

  useEffect(() => {
    if (!authLoading && isPublisher) {
      loadFinance();
    }
  }, [authLoading, isPublisher, loadFinance]);

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);

    const amountRupees = Number(depositRupees);
    if (!amountRupees || amountRupees < 100) {
      setDepositError('Minimum deposit amount is ₹100.');
      return;
    }

    try {
      const { result: res } = await dispatch(depositPublisherFunds({ publisherId, data: {
        amount_paise: Math.round(amountRupees * 100),
        payment_method: paymentMethod,
      } })).unwrap();
      setDepositSuccess(`Successfully deposited ${Money.formatINR(res.amount_paise)} (Ref: ${res.reference_id})`);
      await loadFinance(true);
      setTimeout(() => {
        setShowDepositModal(false);
        setDepositSuccess(null);
      }, 1500);
    } catch (err) {
      setDepositError(err.message || 'Deposit simulation failed.');
    }
  };

  // WithdrawModal validates the destination, then calls this handler. The
  // mutation itself is owned by payoutSlice, not by a direct page API call.
  const handleWithdraw = useCallback(
    (details) => dispatch(withdrawPublisher({ publisherId, dto: details })).unwrap(),
    [dispatch, publisherId]
  );

  const handleExportCSV = () => {
    if (!financeData?.recent_transactions?.length) return;
    const headers = ['Transaction ID', 'Date', 'Type', 'Description', 'Amount (INR)', 'Balance After (INR)', 'Status'];
    const rows = financeData.recent_transactions.map((t) => [
      t.transaction_id,
      t.created_at,
      t.type,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      (t.amount_paise / 100).toFixed(2),
      (t.balance_after_paise / 100).toFixed(2),
      t.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `statement_${user?.userId || 'publisher'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return <LoadingState message="Checking publisher credentials…" minHeight="60vh" />;
  }

  if (!isPublisher) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Publisher Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            You must be signed in with a publisher account to access studio financial accounts.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const transactions = financeData?.recent_transactions || [];
  const filteredTransactions = ledgerFilter === 'all'
    ? transactions
    : transactions.filter((t) => t.type === ledgerFilter);

  const reservations = financeData?.tournament_reservations || [];
  const perGame = financeData?.per_game || [];

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header-row mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/publisher/dashboard')} style={{ padding: '0.5rem' }}>
            ❮ Dashboard
          </button>
          <div>
            <h1 style={{ margin: 0 }}>💼 Studio Finance & Balances</h1>
            <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
              {financeData?.studio_name || 'Your Studio'} — Cleared funds, tournament prize escrow, and append-only ledger
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowDepositModal(true)}
            data-testid="deposit-funds-btn"
          >
            💳 Deposit Funds (Sandbox)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            disabled={!transactions.length}
            title="Download full statement as CSV"
          >
            📥 Export Statement
          </button>
        </div>
      </div>

      {financeStatus === 'loading' || (!financeData && financeStatus !== 'failed') ? (
        <LoadingState message="Loading studio balances and transaction records…" minHeight="40vh" />
      ) : financeError ? (
        <div className="card text-center p-4">
          <p style={{ color: 'var(--accent-danger)' }}>{financeError}</p>
          <button type="button" className="btn btn-primary btn-sm mt-2" onClick={() => loadFinance()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="finance-dashboard">
          {/* Top KPI Balance Cards */}
          <div className="earn-hero mb-3">
            {/* 1. Available to withdraw */}
            <div className="earn-stat highlight">
              <div className="earn-val" style={{ color: '#10b981' }}>
                {Money.formatINR(financeData.available_paise)}
              </div>
              <div className="earn-lbl">Available Cleared Balance</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Includes royalties, rake share & deposited sandbox balance
              </div>
              {financeData.can_withdraw ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm earn-withdraw mt-2"
                  onClick={() => setShowWithdraw(true)}
                >
                  Withdraw {Money.formatINR(financeData.available_paise)}
                </button>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Min withdrawal: {Money.formatINR(financeData.withdraw_threshold_paise)}
                </div>
              )}
            </div>

            {/* 2. Prize Escrow Reserved */}
            <div className="earn-stat">
              <div className="earn-val" style={{ color: '#38bdf8' }}>
                {Money.formatINR(financeData.reserved_prize_paise)}
              </div>
              <div className="earn-lbl">Tournament Prize Escrow</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Guaranteed & locked for active tournaments
              </div>
            </div>

            {/* 3. In Transit */}
            <div className="earn-stat">
              <div className="earn-val" style={{ color: '#f59e0b' }}>
                {Money.formatINR(financeData.in_transit_paise)}
              </div>
              <div className="earn-lbl">In Transit (Processing)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Pending gateway transfer
              </div>
            </div>

            {/* 4. Lifetime Gross Attributable */}
            <div className="earn-stat">
              <div className="earn-val">{Money.formatINR(financeData.lifetime_earned_paise)}</div>
              <div className="earn-lbl">Lifetime Net Studio Revenue</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Paid out: {Money.formatINR(financeData.paid_out_paise)}
              </div>
            </div>
          </div>

          {/* Tournament Prize Reservations Card */}
          <div className="card mb-3 p-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>🏆 Tournament Prize Escrow Guarantee</h3>
                <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  PlayCarys financial invariant: Publishers cannot publish prize tournaments without 100% pre-funded escrow.
                </p>
              </div>
              <span className="badge badge-info">{reservations.length} Active Reservations</span>
            </div>

            {reservations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                  No active tournament prize escrows reserved right now. Create a tournament to guarantee prizes.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tournament</th>
                      <th>Status</th>
                      <th>Prize Pool</th>
                      <th>Entrants</th>
                      <th>Platform Cut</th>
                      <th>Escrow Policy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((t) => (
                      <tr key={t.tournament_id}>
                        <td>
                          <strong>{t.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{t.tournament_id}</div>
                        </td>
                        <td>
                          <span className={`badge ${t.status === 'upcoming' ? 'badge-primary' : 'badge-active'}`}>
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#10b981' }}>{Money.formatINR(t.prize_pool_paise)}</strong>
                        </td>
                        <td>{t.participants} entrants</td>
                        <td>{t.rake_pct}% rake</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>🔒 100% Pre-funded</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Append-Only Fiat Ledger Table */}
          <div className="card mb-3 p-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>📑 Append-Only Financial Ledger & Audit Trail</h3>
                <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  Immutable statement entries recorded in integer paise minor units.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label htmlFor="ledger-filter-select" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type:</label>
                <select
                  id="ledger-filter-select"
                  className="form-control"
                  style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                  value={ledgerFilter}
                  onChange={(e) => setLedgerFilter(e.target.value)}
                >
                  <option value="all">All Transactions</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="earning">Royalties & Earnings</option>
                  <option value="prize_reservation">Prize Reservations</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  No ledger transactions found matching the selected filter.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref ID / Txn</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Balance After</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => {
                      const isCredit = tx.amount_paise > 0;
                      return (
                        <tr key={tx.transaction_id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                          <td>
                            <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                              {tx.reference_id || tx.transaction_id.slice(0, 16)}
                            </code>
                          </td>
                          <td>
                            <span className={`badge ${
                              tx.type === 'deposit' ? 'badge-active' :
                              tx.type === 'withdrawal' ? 'badge-warning' :
                              tx.type === 'prize_reservation' ? 'badge-info' : 'badge-primary'
                            }`}>
                              {tx.type.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{tx.description}</td>
                          <td>
                            <strong style={{ color: isCredit ? '#10b981' : '#f43f5e' }}>
                              {isCredit ? '+' : ''}{Money.formatINR(tx.amount_paise)}
                            </strong>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{Money.formatINR(tx.balance_after_paise)}</td>
                          <td>
                            <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                              {tx.status.toUpperCase()}
                            </span>
                            {tx.is_sandbox && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: '#f59e0b' }}>
                                [Sandbox]
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Game Attribution Table */}
          {perGame.length > 0 && (
            <div className="card p-3">
              <h3 style={{ margin: '0 0 0.5rem 0' }}>🎮 Revenue Attribution by Game Title</h3>
              <p className="text-muted" style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>
                Breakdown of session royalties and tournament rake collected for your studio's published titles.
              </p>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Game Title</th>
                      <th>Verified Sessions</th>
                      <th>Session Royalties</th>
                      <th>Tournament Rake</th>
                      <th>Gross Attributable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perGame.map((g) => (
                      <tr key={g.game_id}>
                        <td>
                          <strong>{g.game_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{g.game_id}</div>
                        </td>
                        <td>{g.sessions.toLocaleString()} sessions</td>
                        <td style={{ color: '#10b981' }}>{g.royalty_display}</td>
                        <td style={{ color: '#38bdf8' }}>{g.rake_display}</td>
                        <td>
                          <strong>{g.gross_display}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deposit Funds Modal */}
      {showDepositModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-dialog" style={{ background: 'var(--surface-primary, #1e293b)', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '90%', padding: '1.5rem', border: '1px solid var(--border-color, #334155)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>💳 Deposit Funds (Sandbox Simulator)</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDepositModal(false)}
                disabled={depositStatus === 'loading'}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Simulate adding INR funds to your studio balance. Deposited funds can be used immediately to pre-fund and guarantee tournament prize pools.
            </p>

            {depositSuccess && (
              <div className="badge badge-active mb-3 p-2" style={{ display: 'block', textAlign: 'center' }}>
                {depositSuccess}
              </div>
            )}
            {depositError && (
              <div className="badge badge-danger mb-3 p-2" style={{ display: 'block', textAlign: 'center' }}>
                {depositError}
              </div>
            )}

            <form onSubmit={handleDepositSubmit}>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Amount (INR ₹)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {[500, 1000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`btn btn-sm ${depositRupees === amt ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setDepositRupees(amt)}
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  className="form-control"
                  min="100"
                  step="50"
                  value={depositRupees}
                  onChange={(e) => setDepositRupees(e.target.value)}
                  placeholder="Enter custom amount (min ₹100)"
                  required
                />
                <small className="text-muted">Minimum deposit is ₹100 (10,000 paise).</small>
              </div>

              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Simulated Payment Rail</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="UPI Sandbox (GPay / PhonePe)">UPI Sandbox (Instant Confirmation)</option>
                  <option value="NetBanking Sandbox (HDFC/ICICI)">NetBanking Sandbox</option>
                  <option value="Test Corporate Card (Visa/Mastercard)">Corporate Card Sandbox</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDepositModal(false)}
                  disabled={depositStatus === 'loading'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={depositStatus === 'loading'}
                >
                  {depositStatus === 'loading' ? 'Processing Deposit…' : `Simulate Deposit of ₹${Number(depositRupees || 0).toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <WithdrawModal
          userId={publisherId}
          amountPaise={financeData.available_paise}
          resumePayout={financeData.active_payout}
          onWithdraw={handleWithdraw}
          onClose={(changed) => {
            setShowWithdraw(false);
            if (changed) loadFinance(true);
          }}
        />
      )}
    </div>
  );
}

export default PublisherFinance;
