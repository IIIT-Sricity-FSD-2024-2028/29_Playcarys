/*
 * Concepts used in this component:
 *  - Components, Props (game, data, role, note, noteError, handlers), Forms (controlled note box with
 *    an error message), Events (Approve / Reject / Re-scan clicks), Callbacks (onDecide, onRescan),
 *    Refs are passed in from the page (noteRef) so the page can focus the note on an error
 *
 * "Decision" card: blockers, the reviewer's note, and the Approve / Reject / Re-scan buttons.
 * A failed scan cannot be approved by an admin; a superuser may override it with a written note.
 */
import React from 'react';

export function DecisionCard(props) {
  const { game: g, data, role, note, noteError, noteRef, onNoteChange, onDecide, onRescan } = props;

  const scan = data.scan;
  const blockers = data.blockers || [];
  const isSuper = role === 'superuser';
  const failed = scan && scan.verdict === 'fail';
  const decided = g.game_approval_status !== 'pending';

  // A failed scan is not an admin's call (the server enforces this too).
  const blockedByReason = blockers.some(
    (b) => b.indexOf('no uploaded build') >= 0 || b.indexOf('never been scanned') >= 0 ||
      b.indexOf('stale') >= 0 || b.indexOf('No build') >= 0 || b.indexOf('No game URL') >= 0
  );
  const canApprove = !decided && (!failed || isSuper) && !blockedByReason;
  const hideRescan = g.hosting_type === 'selfhosted' || !g.play_path;

  let hint = '';
  if (!decided) {
    if (failed && !isSuper) {
      hint = 'This build failed its scan. Approval is blocked for admins — reject it, or ask a superuser to review the finding.';
    } else if (failed && isSuper) {
      hint = 'Superuser override: approving a failed scan requires a note justifying it, and the override is recorded permanently.';
    } else {
      hint = 'Approval binds to this exact build (' + String(g.bundle_hash || 'self-hosted URL').slice(0, 12) +
        '). If the publisher uploads a different one, the listing comes straight back here.';
    }
  }

  let blockersBlock = null;
  if (decided) {
    blockersBlock = (
      <div className="finding f-low" style={{ marginBottom: '.75rem' }}>
        <div className="f-msg">
          This listing is already <strong>{g.game_approval_status}</strong>. It re-enters the queue automatically if the publisher changes the build or the URL.
        </div>
      </div>
    );
  } else if (blockers.length) {
    blockersBlock = blockers.map((b, i) => (
      <div className={'finding f-' + (failed ? 'critical' : 'high')} style={{ marginBottom: '.5rem' }} key={i}>
        <div className="f-msg">{b}</div>
      </div>
    ));
  }

  return (
    <div className="card">
      <p className="sec-title">Decision</p>
      <div id="blockers">{blockersBlock}</div>
      <div className="form-group">
        <label className="form-label" htmlFor="note">Reviewer note</label>
        <textarea
          className="form-input"
          id="note"
          rows="4"
          ref={noteRef}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Required when rejecting. The publisher sees this text — tell them what to fix."
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        ></textarea>
        <span className={'form-error' + (noteError ? ' show' : '')} id="note-err" style={{ display: 'block', marginTop: '.35rem' }}>{noteError}</span>
      </div>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-green" id="btn-approve" disabled={!canApprove} onClick={() => onDecide('approved')}>✓ Approve &amp; Publish</button>
        <button className="btn btn-red" id="btn-reject" disabled={decided} onClick={() => onDecide('rejected')}>✕ Reject</button>
        <button className={'btn btn-ghost btn-sm' + (hideRescan ? ' hidden' : '')} id="btn-rescan" onClick={onRescan}>↻ Re-scan</button>
      </div>
      <p style={{ fontSize: '.74rem', color: 'var(--text-muted)', margin: '.75rem 0 0', lineHeight: 1.5 }} id="decision-hint">{hint}</p>
    </div>
  );
}

export default DecisionCard;
