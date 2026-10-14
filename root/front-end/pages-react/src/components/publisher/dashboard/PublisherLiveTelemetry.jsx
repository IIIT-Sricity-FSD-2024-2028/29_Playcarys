import React, { useState, useEffect } from 'react';
import publisherService from '../../../services/publisherService';

export function PublisherLiveTelemetry(props) {
  const { hasHillClimbing } = props;
  const [dispatchStatus, setDispatchStatus] = useState('');
  const [telemetry, setTelemetry] = useState([]);

  useEffect(() => {
    if (!hasHillClimbing) return;

    // Initial load
    setTelemetry(publisherService.getTelemetry(8));

    // Periodic telemetry update every 2000ms
    const interval = setInterval(() => {
      setTelemetry(publisherService.getTelemetry(8));
    }, 2000);

    return () => clearInterval(interval);
  }, [hasHillClimbing]);

  if (!hasHillClimbing) {
    return null;
  }

  function handleDispatch(code) {
    publisherService.fireLiveEvent(8, code);
    setDispatchStatus(`✓ Event '${code}' dispatched to live engines!`);
    setTimeout(() => {
      setDispatchStatus('');
    }, 4000);
  }

  return (
    <div className="live-panel" id="live-panel">
      <div className="live-header">
        <div>
          <h3 style={{ color: 'var(--accent-purple)', marginBottom: '0.2rem' }}>
            📡 Live Interventions & Telemetry
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Hill Climbing — Real-Time Engine Control
          </p>
        </div>
        <div className="live-badge">
          <div className="live-dot" />
          Live Active
        </div>
      </div>

      <div className="live-grid">
        <div>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem'
            }}
          >
            Inject real-time physics variables into active sessions to challenge
            players or create viral moments.
          </p>
          <div className="live-btn-row">
            <button
              className="btn btn-purple btn-sm"
              onClick={() => handleDispatch('low_gravity')}
            >
              ✨ Low Gravity (8s)
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#ef4444', color: '#fff' }}
              onClick={() => handleDispatch('heavy_gravity')}
            >
              🧱 Heavy Gravity (8s)
            </button>
          </div>
          {dispatchStatus && (
            <p
              id="event-dispatch-status"
              style={{
                fontSize: '0.8rem',
                marginTop: '0.75rem',
                color: 'var(--accent-green)'
              }}
            >
              {dispatchStatus}
            </p>
          )}
        </div>

        <div>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.75rem'
            }}
          >
            Player Death Heatmap — X-Coordinate Telemetry
          </p>
          <div className="telemetry-log" id="telemetry-log">
            {telemetry.length > 0 ? (
              telemetry
                .slice()
                .reverse()
                .map((t, index) => (
                  <div className="telemetry-entry" key={t.id || index}>
                    <span>💥 Crash at {t.data?.x || '??'}m</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {t.time ? new Date(t.time).toLocaleTimeString() : 'now'}
                    </span>
                  </div>
                ))
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>
                Listening for player telemetry…
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublisherLiveTelemetry;
