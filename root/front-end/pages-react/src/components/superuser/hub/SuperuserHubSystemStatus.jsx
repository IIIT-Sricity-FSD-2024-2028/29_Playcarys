import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export function SuperuserHubSystemStatus(props) {
  const { loadedRows = 0 } = props;

  const [apiStatus, setApiStatus] = useState({
    detail: 'checking…',
    colour: 'var(--accent-yellow)'
  });

  useEffect(() => {
    let isMounted = true;
    const apiBase = api.getBaseUrl();
    const endpoint = apiBase.replace(/\/api\/v1$/, '/api/v1');
    const t0 = performance.now();

    fetch(endpoint, { method: 'GET' })
      .then((res) => {
        if (!isMounted) return;
        const ms = Math.round(performance.now() - t0);
        if (res.ok) {
          setApiStatus({
            detail: `${ms} ms`,
            colour: 'var(--accent-green)'
          });
        } else {
          setApiStatus({
            detail: `HTTP ${res.status}`,
            colour: 'var(--accent-yellow)'
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setApiStatus({
          detail: 'unreachable',
          colour: 'var(--accent-red)'
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const renderDot = (c) => (
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: c,
        boxShadow: `0 0 6px ${c}`
      }}
    />
  );

  const renderRow = (name, detail, colour) => (
    <div
      key={name}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.3rem 0',
        fontSize: '0.8rem'
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
      <span
        style={{
          marginLeft: 'auto',
          fontSize: '0.72rem',
          color: 'var(--text-muted, #6b7280)'
        }}
      >
        {detail}
      </span>
      {renderDot(colour)}
    </div>
  );

  const dataColour = loadedRows > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const dataDetail = `${loadedRows.toLocaleString('en-IN')} rows`;

  return (
    <div id="sys-status">
      {renderRow('API server', apiStatus.detail, apiStatus.colour)}
      {renderRow('Data loaded', dataDetail, dataColour)}
    </div>
  );
}

export default SuperuserHubSystemStatus;
