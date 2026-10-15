/*
 * Concepts used in this component:
 *  - Components, Props (scan), Lists (one block per finding)
 *
 * "🔍 Scan Findings" card: what the scanner found in the build, and where.
 */
import React from 'react';

export function ScanFindings(props) {
  const { scan } = props;

  const findings = scan ? scan.findings || [] : [];
  const countText = scan && findings.length ? '(' + findings.length + ')' : '';

  let body;
  if (!scan) {
    body = <p className="text-muted" style={{ fontSize: '.85rem' }}>Nothing to show — this build has not been scanned.</p>;
  } else if (!findings.length) {
    body = <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>No findings. The build's source contains none of the patterns we look for.</p>;
  } else {
    body = (
      <>
        {findings.map((x, i) => (
          <div className={'finding f-' + x.severity} key={i}>
            <div className="f-head">
              <span className={'f-sev s-' + x.severity}>{x.severity}</span>
              <span className="f-code">{x.code}</span>
              <span className="f-loc">{x.file}{x.line ? ':' + x.line : ''}</span>
            </div>
            <div className="f-msg">{x.message}</div>
            {x.snippet ? <div className="f-snip">{x.snippet}</div> : null}
          </div>
        ))}
        {scan.truncated ? (
          <p className="text-muted" style={{ fontSize: '.78rem', marginTop: '.5rem' }}>⚠ {scan.truncated}</p>
        ) : null}
      </>
    );
  }

  return (
    <div className="card mb-2">
      <h3 className="mb-2">🔍 Scan Findings <span className="text-muted" style={{ fontSize: '.8rem', fontWeight: 400 }} id="find-count">{countText}</span></h3>
      <div id="findings">{body}</div>
    </div>
  );
}

export default ScanFindings;
