import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchPlatformStatus } from '../../../features/platform/platformSlice';

export function SuperuserHubSystemStatus(props) {
  const { loadedRows = 0 } = props;
  const dispatch = useDispatch();

  const [apiStatus, setApiStatus] = useState({
    detail: 'checking…',
    colour: 'var(--accent-yellow)'
  });

  useEffect(() => {
    let isMounted = true;
    const t0 = performance.now();

    dispatch(fetchPlatformStatus())
      .unwrap()
      .then(() => {
        if (!isMounted) return;
        const ms = Math.round(performance.now() - t0);
        setApiStatus({
          detail: `${ms} ms`,
          colour: 'var(--accent-green)'
        });
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
  }, [dispatch]);

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
