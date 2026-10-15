/*
 * Concepts used in this file:
 *  - Components, Props (scan, game, reason)
 *
 * The two banners at the top of the review console: the scan verdict, and the
 * "back in the queue" notice for a listing that was live and got pulled back.
 */
import React from 'react';

export function VerdictBanner(props) {
  const { scan, game: g } = props;

  if (!scan) {
    const why = g.hosting_type === 'selfhosted'
      ? 'This is a self-hosted game — we do not hold its files, so there is nothing to scan. ' +
        'Open the URL below and judge it yourself, and remember the publisher can change what it serves at any time.'
      : 'No scan on file for this build. Run a re-scan before deciding.';
    return (
      <div className="verdict v-none">
        <div className="vi">○</div>
        <div>
          <h3>Not scanned</h3>
          <p>{why}</p>
        </div>
      </div>
    );
  }

  const s = scan.summary || {};
  const map = {
    pass: ['v-pass', '✓', 'Scan passed',
      "Nothing suspicious found in the build's source. Still play it in the sandbox — a scanner cannot tell whether this is the game the listing claims."],
    warn: ['v-warn', '!', 'Needs your judgement',
      'The build does things a normal game might also do. Read each finding below and decide whether it fits what this game is supposed to be.'],
    fail: ['v-fail', '✕', 'Scan failed',
      'Something here has no legitimate use in a game bundle. This cannot be approved by an admin — reject it, or escalate if you believe the finding is wrong.']
  };
  const m = map[scan.verdict] || map.warn;
  const counts = ['critical', 'high', 'medium', 'low']
    .filter((k) => s[k])
    .map((k) => s[k] + ' ' + k)
    .join(' · ') || 'no findings';

  return (
    <div className={'verdict ' + m[0]}>
      <div className="vi">{m[1]}</div>
      <div>
        <h3>{m[2]} — {counts}</h3>
        <p>{m[3]}</p>
      </div>
    </div>
  );
}

export function RevokedBanner(props) {
  const { reason } = props;

  if (!reason) return null;

  return (
    <div className="verdict v-warn" style={{ background: 'rgba(245,158,11,.05)' }}>
      <div className="vi">↺</div>
      <div>
        <h3>Back in the queue</h3>
        <p>{reason} It was taken offline automatically and stays offline until this review is decided.</p>
      </div>
    </div>
  );
}
