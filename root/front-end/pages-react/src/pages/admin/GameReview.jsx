/*
 * Concepts used in this component:
 *  - Components, Props (data passed to each card), State (load status, review data, note, note error),
 *    Events (Approve / Reject / Re-scan / Retry / Back clicks), Hooks (useState, useEffect, useRef,
 *    useContext, useSearchParams), API calls (load the review, re-scan, send the decision),
 *    Forms (the reviewer note), Context (AuthContext for the reviewer, AdminContext for toast and
 *    the confirm dialog), Router (useSearchParams reads ?gameId, useAdminNav goes back),
 *    Callbacks (confirmAction runs the decision only after "Confirm"), prop drilling (handlers go
 *    page → DecisionCard)
 *
 * Mirrors pages/admin/game-review.html: the build review console. Approving a build is decided here,
 * after looking at the scan findings, the files and the game itself.
 */
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext';
import { useAdminNav } from '../../components/admin/common/adminPages';
import StatusBadge from '../../components/admin/common/StatusBadge';
import { VerdictBanner, RevokedBanner } from '../../components/admin/gamereview/ReviewBanners';
import ScanFindings from '../../components/admin/gamereview/ScanFindings';
import ProposedAchievements from '../../components/admin/gamereview/ProposedAchievements';
import SandboxPreview from '../../components/admin/gamereview/SandboxPreview';
import FileManifest from '../../components/admin/gamereview/FileManifest';
import SubmissionCard from '../../components/admin/gamereview/SubmissionCard';
import DeliveryCard from '../../components/admin/gamereview/DeliveryCard';
import ReviewHistory from '../../components/admin/gamereview/ReviewHistory';
import DecisionCard from '../../components/admin/gamereview/DecisionCard';
import { fetchReview, rescanGame, submitDecision, syncLocal } from '../../services/adminReviewService';
import '../../styles/admin/game-review.css';

export function GameReview() {
  const { user } = useContext(AuthContext);
  const { toast, confirmAction } = useContext(AdminContext);
  const go = useAdminNav();
  const [params] = useSearchParams();
  const gameId = params.get('gameId');

  // status: 'loading' | 'error' | 'ready' | 'nogame'
  const [status, setStatus] = useState(gameId ? 'loading' : 'nogame');
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const noteRef = useRef(null);
  const busy = useRef(false);

  // The whole review comes from the backend: the scan report only exists there.
  async function load() {
    setStatus('loading');
    try {
      const review = await fetchReview(gameId, user.role);
      setData(review);
      setStatus('ready');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Review Build';
    if (gameId) load();
  }, [gameId]);

  async function handleRescan() {
    if (busy.current) return;
    busy.current = true;
    toast.info('Re-scanning the installed build…');
    try {
      await rescanGame(gameId, user.role);
      toast.success('Scan complete.');
      await load();
    } catch (err) {
      toast.error('Re-scan failed: ' + err.message);
    } finally {
      busy.current = false;
    }
  }

  function handleDecide(decision) {
    if (busy.current) return;
    const g = data.game || {};
    const noteText = note.trim();
    const failed = data.scan && data.scan.verdict === 'fail';
    const isSuper = user.role === 'superuser';

    if (decision === 'rejected' && !noteText) {
      setNoteError('Say what is wrong — this text is what the publisher receives.');
      noteRef.current.focus();
      return;
    }
    if (decision === 'approved' && failed && isSuper && !noteText) {
      setNoteError('Overriding a failed scan requires a written justification.');
      noteRef.current.focus();
      return;
    }
    setNoteError('');

    const confirmMsg = decision === 'approved'
      ? 'Publish "' + (g.game_name || 'this game') + '" to players? Approval applies to the build you just reviewed — a different upload returns it here.'
      : 'Reject "' + (g.game_name || 'this game') + '"? The publisher is notified with your note.';

    confirmAction(decision === 'approved' ? 'Approve Build' : 'Reject Build', confirmMsg, async () => {
      busy.current = true;
      const body = { game_approval_status: decision, reviewer_id: parseInt(user.userId, 10) };
      if (decision === 'approved' && failed && isSuper) body.override_note = noteText;
      else if (noteText) body.note = noteText;

      try {
        const updated = await submitDecision(gameId, user.role, body);
        syncLocal(data, gameId, user, updated, decision, noteText);
        toast.success(decision === 'approved' ? 'Build approved and published.' : 'Build rejected.');
        setTimeout(() => go('approvals'), 1100);
      } catch (err) {
        toast.error('Decision not saved: ' + err.message);
        busy.current = false;
      }
    }, decision === 'approved' ? 'primary' : 'danger');
  }

  const g = data ? data.game || {} : {};
  const title = status === 'ready' ? g.game_name || 'Untitled game' : 'Review Build';

  let subtitle = 'Loading submission…';
  if (status === 'ready') {
    subtitle = (
      <>
        Submitted by <strong>{data.publisher ? data.publisher.user_name : 'Unknown'}</strong>
        {g.submittedDate ? ' on ' + g.submittedDate : ''} · <StatusBadge status={g.game_approval_status || 'pending'} />
      </>
    );
  }

  let loadBlock;
  if (status === 'nogame') {
    loadBlock = <p className="text-muted">No game selected. Open a submission from the Approvals queue.</p>;
  } else if (status === 'error') {
    loadBlock = (
      <>
        <p style={{ color: 'var(--accent-red)' }}>Could not load this submission.</p>
        <p className="text-muted" style={{ fontSize: '.82rem' }}>{errorMsg}</p>
        <p className="text-muted" style={{ fontSize: '.82rem' }}>
          The review console reads from the backend — it cannot fall back to local storage, because the scan report only exists server-side.
        </p>
        <button className="btn btn-outline mt-2" onClick={load}>Retry</button>
      </>
    );
  } else {
    loadBlock = <p className="text-muted">Fetching the submitted build…</p>;
  }

  const ready = status === 'ready';

  return (
    <div className="page-content admin-game-review">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h1 id="h-title">{title}</h1>
          <p className="text-muted" id="h-sub">{subtitle}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => go('approvals')}>← Back to Approvals</button>
      </div>

      <div id="load-state" className={'card' + (ready ? ' hidden' : '')} style={{ textAlign: 'center', padding: '2.5rem' }}>
        {loadBlock}
      </div>

      <div id="review-body" className={ready ? '' : 'hidden'}>
        {ready ? (
          <>
            <div id="verdict-banner"><VerdictBanner scan={data.scan} game={g} /></div>
            <div id="revoked-banner"><RevokedBanner reason={data.review_required_reason} /></div>

            <div className="rv-grid">
              {/* LEFT: the evidence */}
              <div>
                <ScanFindings scan={data.scan} />
                <ProposedAchievements game={g} reviewerId={user.userId} />
                <SandboxPreview game={g} />
                <FileManifest gameId={gameId} scan={data.scan} role={user.role} />
              </div>

              {/* RIGHT: the facts and the decision */}
              <div>
                <SubmissionCard game={g} publisher={data.publisher} />
                <DeliveryCard game={g} scan={data.scan} changedSinceApproved={data.changed_since_approved} />
                <ReviewHistory history={data.history || []} />
                <DecisionCard
                  game={g}
                  data={data}
                  role={user.role}
                  note={note}
                  noteError={noteError}
                  noteRef={noteRef}
                  onNoteChange={(v) => {
                    setNote(v);
                    if (noteError) setNoteError('');
                  }}
                  onDecide={handleDecide}
                  onRescan={handleRescan}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default GameReview;
