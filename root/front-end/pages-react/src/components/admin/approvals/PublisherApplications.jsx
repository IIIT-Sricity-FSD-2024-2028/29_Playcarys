import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchPublisherApplications, reviewPublisherApplication } from '../../../features/profiles/publisherProfileSlice';
import {
  selectPublisherApplications,
  selectPublisherApplicationsError,
  selectPublisherApplicationsStatus,
  selectPublisherApplicationReviewStatus
} from '../../../features/profiles/selectors';

export default function PublisherApplications() {
  const dispatch = useAppDispatch();
  const applications = useAppSelector(selectPublisherApplications);
  const status = useAppSelector(selectPublisherApplicationsStatus);
  const reviewStatus = useAppSelector(selectPublisherApplicationReviewStatus);
  const error = useAppSelector(selectPublisherApplicationsError);
  const [formError, setFormError] = useState('');
  const busy = reviewStatus === 'loading';

  useEffect(() => {
    dispatch(fetchPublisherApplications());
  }, [dispatch]);

  async function review(event, application) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setFormError('');
    try {
      await dispatch(reviewPublisherApplication({
        userId: application.user_id || application.id,
        data: {
          kind: application.kyc_status === 'pending' ? 'identity' : 'payments',
          decision: fields.get('decision'),
          reason: fields.get('reason'),
          evidence_reference: fields.get('evidence')
        }
      })).unwrap();
      dispatch(fetchPublisherApplications());
    } catch (e) { setFormError(e?.message || e); }
  }
  return <section className="card" style={{ padding: 24, marginBlock: 24 }}>
    <h2>Publisher applications</h2>
    <p>Review identity first, then payment details. Record the reference to evidence you checked before approving.</p>
    {(error || formError) && <p role="alert">{error || formError}</p>}
    {status === 'loading' && !applications.length && <p>Loading applications…</p>}
    {status !== 'loading' && !applications.length && <p>No applications awaiting review.</p>}
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
