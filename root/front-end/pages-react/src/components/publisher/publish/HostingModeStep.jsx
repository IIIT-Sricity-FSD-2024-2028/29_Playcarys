import React from 'react';

export function HostingModeStep({ hostingMode, onSelectHosting, onNext }) {
  return (
    <div id="step-0">
      <div className="pub-section">
        <h3 style={{ marginBottom: '0.3rem' }}>🚀 Choose Hosting Model</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 0 }}>
          Select how you want to deploy your game on PlayCarys
        </p>

        <div className="host-mode-grid">
          {/* Option A: Hosted */}
          <div
            className={`host-card hosted ${hostingMode === 'hosted' ? 'selected' : ''}`}
            id="hcard-hosted"
            onClick={() => onSelectHosting('hosted')}
          >
            <div className="host-card-check" id="hcheck-hosted">
              ✓
            </div>
            <span className="host-icon">🏠</span>
            <div className="host-card-title">Host on PlayCarys</div>
            <div className="host-card-desc">
              We handle servers, scaling, and infrastructure. Upload your game files and go live in minutes.
            </div>
            <div className="host-feature-list">
              <div className="host-feature"><span className="check">✦</span> Zero server setup</div>
              <div className="host-feature"><span className="check">✦</span> Auto leaderboards &amp; profiles</div>
              <div className="host-feature"><span className="check">✦</span> Built-in ad revenue share</div>
              <div className="host-feature"><span className="check">✦</span> Free SSL &amp; CDN</div>
              <div className="host-feature"><span className="check">✦</span> Analytics dashboard</div>
            </div>
          </div>

          {/* Option B: Self-Hosted */}
          <div
            className={`host-card selfhosted ${hostingMode === 'selfhosted' ? 'selected' : ''}`}
            id="hcard-selfhosted"
            onClick={() => onSelectHosting('selfhosted')}
          >
            <div className="host-card-check" id="hcheck-selfhosted">
              ✓
            </div>
            <span className="host-icon">🔧</span>
            <div className="host-card-title">Self-Host with API</div>
            <div className="host-card-desc">
              Host your game on your own servers and connect to PlayCarys via our SDK &amp; API for players, scores and more.
            </div>
            <div className="host-feature-list">
              <div className="host-feature"><span className="check">✦</span> Full infrastructure control</div>
              <div className="host-feature"><span className="check">✦</span> PlayCarys API access</div>
              <div className="host-feature"><span className="check">✦</span> SDK for auth &amp; leaderboards</div>
              <div className="host-feature"><span className="check">✦</span> Webhook support</div>
              <div className="host-feature"><span className="check">✦</span> Enterprise SLA available</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pub-nav">
        <div />
        <button
          className="btn btn-primary btn-lg"
          onClick={onNext}
          id="btn-step0-next"
          disabled={!hostingMode}
        >
          Next — Basic Info →
        </button>
      </div>
    </div>
  );
}

export default HostingModeStep;
