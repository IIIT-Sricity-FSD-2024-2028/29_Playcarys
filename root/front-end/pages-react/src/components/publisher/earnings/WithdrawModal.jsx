/*
 * Concepts used: functional component, props, useState (form + phase),
 * useEffect with cleanup (polling a payout), useRef, controlled inputs,
 * conditional rendering.
 */
import React, { useState, useEffect, useRef } from 'react';
import publisherService from '../../../services/publisherService';
import Money from '../../../utils/money';

const UPI_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9]{1,31}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const POLL_MS = 1200;
const SLOW_AFTER_MS = 60000;

/**
 * Withdraw dialog. One component, four phases:
 *   form -> processing -> success | failed
 * `resumePayout` opens it straight on "processing" for a transfer that was
 * already in flight when the page loaded.
 */
export function WithdrawModal({ userId, amountPaise, resumePayout, onClose }) {
  const [phase, setPhase] = useState(resumePayout ? 'processing' : 'form');
  const [method, setMethod] = useState('upi');
  const [upi, setUpi] = useState('');
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payout, setPayout] = useState(resumePayout || null);
  const [slow, setSlow] = useState(false);
  const startedAt = useRef(Date.now());

  // While processing, ask the server how the transfer is going.
  useEffect(() => {
    if (phase !== 'processing' || !payout) return undefined;
    let cancelled = false;
    startedAt.current = Date.now();

    const timer = setInterval(async () => {
      try {
        const latest = await publisherService.getPayout(payout.payout_id);
        if (cancelled) return;
        if (latest.status === 'paid') {
          setPayout(latest);
          setPhase('success');
        } else if (latest.status === 'failed') {
          setPayout(latest);
          setPhase('failed');
        } else if (Date.now() - startedAt.current > SLOW_AFTER_MS) {
          setSlow(true);
        }
      } catch {
        // a missed poll is not a failure — try again on the next tick
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, payout && payout.payout_id]);

  function validate() {
    if (method === 'upi') {
      if (!UPI_RE.test(upi.trim())) return 'Enter a valid UPI id, like studio@okbank.';
      return '';
    }
    const digits = account.replace(/\s+/g, '');
    if (!/^\d{9,18}$/.test(digits)) return 'Enter a valid bank account number (9 to 18 digits).';
    if (!IFSC_RE.test(ifsc.trim().toUpperCase())) return 'Enter a valid IFSC code, like HDFC0001234.';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const details =
        method === 'upi'
          ? { method, upi_id: upi.trim() }
          : { method, account_number: account.replace(/\s+/g, ''), ifsc: ifsc.trim().toUpperCase() };
      const created = await publisherService.withdraw(userId, details);
      setPayout(created);
      setPhase('processing');
    } catch (err) {
      setFormError(err.message || 'Could not start the withdrawal.');
    } finally {
      setSubmitting(false);
    }
  }

  // Closing mid-transfer is fine: the transfer carries on and the page picks it up.
  const done = phase === 'success' || phase === 'failed';
  const amount = payout ? payout.net_paise : amountPaise;

  return (
    <div className="wd-backdrop" onClick={() => !submitting && onClose(done || phase === 'processing')}>
      <div className="wd-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {phase === 'form' && (
          <form onSubmit={handleSubmit} noValidate>
            <h2 className="wd-title">Withdraw earnings</h2>
            <div className="wd-amount">{Money.formatINR(amountPaise)}</div>
            <p className="wd-sub">This is everything available right now. It is sent in one transfer.</p>

            <div className="wd-tabs">
              <button
                type="button"
                className={`wd-tab ${method === 'upi' ? 'active' : ''}`}
                onClick={() => { setMethod('upi'); setFormError(''); }}
              >
                UPI
              </button>
              <button
                type="button"
                className={`wd-tab ${method === 'bank' ? 'active' : ''}`}
                onClick={() => { setMethod('bank'); setFormError(''); }}
              >
                Bank account
              </button>
            </div>

            {method === 'upi' ? (
              <label className="wd-field">
                <span>UPI id</span>
                <input
                  type="text"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  placeholder="studio@okbank"
                  autoFocus
                />
              </label>
            ) : (
              <>
                <label className="wd-field">
                  <span>Account number</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="123456789012"
                    autoFocus
                  />
                </label>
                <label className="wd-field">
                  <span>IFSC code</span>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    maxLength={11}
                  />
                </label>
              </>
            )}

            {formError && <div className="wd-error">{formError}</div>}

            <div className="wd-actions">
              <button type="button" className="btn btn-ghost" onClick={() => onClose(false)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Starting…' : `Withdraw ${Money.formatINR(amountPaise)}`}
              </button>
            </div>
          </form>
        )}

        {phase === 'processing' && (
          <div className="wd-center">
            <div className="wd-spinner" />
            <h2 className="wd-title">Processing your withdrawal</h2>
            <div className="wd-amount">{Money.formatINR(amount)}</div>
            <p className="wd-sub">
              Sending to {payout && payout.destination_masked ? payout.destination_masked : 'your account'}.
              This usually takes a few seconds.
            </p>
            {slow && (
              <p className="wd-sub">
                This is taking longer than usual. You can close this window — the transfer carries on and
                the status will show on this page.
              </p>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onClose(true)}>
              Close — keep processing
            </button>
          </div>
        )}

        {phase === 'success' && (
          <div className="wd-center">
            <div className="wd-icon ok">✓</div>
            <h2 className="wd-title">Withdrawal sent</h2>
            <div className="wd-amount">{Money.formatINR(amount)}</div>
            <p className="wd-sub">
              Sent to {payout.destination_masked}.
              {payout.gateway_ref && <> Reference <b>{payout.gateway_ref}</b>.</>}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => onClose(true)}>Done</button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="wd-center">
            <div className="wd-icon bad">!</div>
            <h2 className="wd-title">Withdrawal didn't go through</h2>
            <p className="wd-sub">{payout.failure_reason || 'The transfer was declined.'}</p>
            <p className="wd-sub">Nothing was taken. {Money.formatINR(amount)} is available again.</p>
            <button type="button" className="btn btn-primary" onClick={() => onClose(true)}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WithdrawModal;
