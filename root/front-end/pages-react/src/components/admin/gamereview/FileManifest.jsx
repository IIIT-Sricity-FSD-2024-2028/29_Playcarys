/*
 * Concepts used in this component:
 *  - Components, Props (gameId, scan, role), State (the file list, or a failure), Hooks (useState,
 *    useEffect), API calls (the list is fetched on demand), Lists (one table row per file)
 *
 * "📁 Files": every file in the build with its size and hash. It is fetched on demand
 * (GET /games/:id/scan-manifest) because it is large and only this page shows it.
 */
import React, { useState, useEffect } from 'react';
import { fetchManifest, kb } from '../../../services/adminReviewService';

const NOTE_STYLE = { fontSize: '.85rem', padding: '.75rem' };

export function FileManifest(props) {
  const { gameId, scan, role } = props;
  const [files, setFiles] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);

  const expected = (scan && (scan.manifest_file_count != null ? scan.manifest_file_count : (scan.manifest || []).length)) || 0;

  useEffect(() => {
    if (!expected) return;
    fetchManifest(gameId, role)
      .then(setFiles)
      .catch(() => setFailed(true));
  }, [gameId, role, expected]);

  let body;
  if (!expected) {
    body = <p className="text-muted" style={NOTE_STYLE}>No file list available.</p>;
  } else if (failed) {
    body = <p className="text-muted" style={NOTE_STYLE}>Could not load the file list.</p>;
  } else if (files === null) {
    body = <p className="text-muted" style={NOTE_STYLE}>Loading {expected} files…</p>;
  } else if (!files.length) {
    body = <p className="text-muted" style={NOTE_STYLE}>No file list available.</p>;
  } else {
    body = (
      <table>
        <thead>
          <tr><th>Path</th><th style={{ textAlign: 'right' }}>Size</th><th>SHA-256</th></tr>
        </thead>
        <tbody>
          {files.map((f, i) => (
            <tr key={i}>
              <td>{f.path}</td>
              <td className="n">{kb(f.bytes)}</td>
              <td className="h">{String(f.sha256 || '').slice(0, 16)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="card">
      <h3 className="mb-2">📁 Files <span className="text-muted" style={{ fontSize: '.8rem', fontWeight: 400 }} id="file-count">{expected ? '(' + expected + ')' : ''}</span></h3>
      <div className="files" id="manifest">{body}</div>
    </div>
  );
}

export default FileManifest;
