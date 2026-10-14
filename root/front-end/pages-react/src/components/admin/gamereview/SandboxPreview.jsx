/*
 * Concepts used in this component:
 *  - Components, Props (game), State (is the build loaded into the frame?), Events (button click),
 *    Hooks (useState)
 *
 * "▶ Sandbox Preview": runs the submitted build in an isolated frame. The `sandbox` attribute
 * without allow-same-origin puts it in an opaque origin: scripts run, but the reviewer's
 * session, storage and page are unreachable. (Deliberately NOT how players get the game.)
 */
import React, { useState } from 'react';

export function SandboxPreview(props) {
  const { game: g } = props;
  const [loaded, setLoaded] = useState(false);

  let message;
  let hideButton = false;
  if (g.hosting_type === 'selfhosted') {
    message = g.game_url
      ? 'Loads ' + g.game_url + " from the publisher's own server. What you see now is not necessarily what players get later."
      : 'No URL provided yet.';
    hideButton = !g.game_url;
  } else if (!g.play_path) {
    message = 'No build has been uploaded for this listing.';
    hideButton = true;
  } else {
    message = 'Runs in an isolated frame with no access to your admin session.';
  }

  const url = g.hosting_type === 'selfhosted'
    ? g.game_url
    : '/' + String(g.play_path).replace(/^\/+/, '') + '/index.html?review=1';

  function handleLoad() {
    if (!url) return;
    setLoaded(true);
  }

  return (
    <div className="card mb-2">
      <h3 className="mb-2">▶ Sandbox Preview</h3>
      <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)', margin: '0 0 .75rem' }}>
        The build runs here with no access to your session — scripts only, in an opaque
        origin. Play it briefly: does it look like the game the listing describes?
      </p>
      <div className="preview" id="preview-wrap">
        {loaded ? (
          <iframe sandbox="allow-scripts allow-pointer-lock" referrerPolicy="no-referrer" src={url}></iframe>
        ) : (
          <div className="ph" id="preview-ph">
            <div style={{ fontSize: '2rem', opacity: 0.5 }}>🎮</div>
            <p id="preview-ph-msg">{message}</p>
            <button
              className={'btn btn-outline btn-sm' + (hideButton ? ' hidden' : '')}
              id="preview-btn"
              onClick={handleLoad}
            >
              Load build in sandbox
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SandboxPreview;
