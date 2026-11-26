import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import {
  fetchPublisherApplications,
  reviewPublisherApplication
} from '../../../features/games/gameReviewSlice';

export default function PublisherApplications() {
  const dispatch = useAppDispatch();
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const res = await dispatch(fetchPublisherApplications()).unwrap();
      setApplications(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e.message || String(e));
    }
  };
  useEffect(() => { load(); }, []);
  async function review(event, application) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await dispatch(reviewPublisherApplication({
        userId: application.user_id,
        data: {
          kind: application.kyc_status === 'pending' ? 'identity' : 'payments',
          decision: fields.get('decision'),
          reason: fields.get('reason'),
          evidence_reference: fields.get('evidence'),
        }
      })).unwrap();
      await load();
    } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  }
  return <section className="card" style={{ padding: 24, marginBlock: 24 }}>
    <h2>Publisher applications</h2>
    <p>Review identity first, then payment details. Record the reference to evidence you checked before approving.</p>
    {error && <p role="alert">{error}</p>}
    {!applications.length && <p>No applications awaiting review.</p>}
    {applications.map(application => <form key={application.user_id} onSubmit={e => review(e, application)} style={{ borderTop: '1px solid #334155', paddingBlock: 20, display: 'grid', gap: 12 }}>
      <h3>{application.legal_name || `Publisher #${application.user_id}`}</h3>
      <p>{application.publisher_type} · {application.country} · {application.kyc_status === 'pending' ? 'Identity review' : 'Payment review'}</p>
      {application.payout_destination_masked && <p>Payment destination: {application.payout_destination_masked}</p>}
      <label>Verification evidence reference<input className="form-input" name="evidence" required minLength={5} /></label>
      <label>Review notes<textarea className="form-input" name="reason" required minLength={10} /></label>
      <label>Decision<select className="form-input" name="decision" required defaultValue=""><option value="" disabled>Select a decision</option><option value="approve">Approve</option><option value="reject">Request corrections</option></select></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save review decision'}</button>
    </form>)}
  </section>;
}
