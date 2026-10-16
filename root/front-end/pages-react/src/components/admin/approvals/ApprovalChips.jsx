/*
 * Concepts used in this file:
 *  - Components, Props (game)
 *
 * The small hint badges on each pending game row (old scanChip() and deliveryChip()):
 * what the build scan found, and whether PlayCarys hosts the game or the publisher does.
 */
import React from 'react';

export function ScanChip(props) {
  const { game: g } = props;
  const verdict = g.scan && g.scan.verdict;

  if (g.hosting_type === 'selfhosted' || g.hostingType === 'selfhosted') {
    return <span className="badge badge-pending" title="We do not hold this game's files">Not scannable</span>;
  }
  if (!g.play_path && !g.playPath) {
    return <span className="badge badge-disabled" title="The publisher has not uploaded a build">No build</span>;
  }
  if (!verdict) {
    return <span className="badge badge-pending">Unscanned</span>;
  }

  const summary = g.scan.summary || {};
  const map = {
    pass: ['badge-approved', 'Scan clean'],
    warn: ['badge-pending', `${(summary.high || 0) + (summary.medium || 0)} to check`],
    fail: ['badge-rejected', 'Scan failed']
  };
  const [cls, label] = map[verdict] || map.warn;
  return <span className={'badge ' + cls}>{label}</span>;
}

export function DeliveryChip(props) {
  const { game: g } = props;
  const mode = g.hosting_type || g.hostingType;

  if (mode === 'selfhosted') return <span className="badge badge-waiting">🔧 Self-hosted</span>;
  if (mode === 'hosted') return <span className="badge badge-active">🏠 Hosted</span>;
  return null;
}
