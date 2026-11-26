import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import publisherService from '../../../services/publisherService';

export function PublisherApiKeyManager({
  apiKeys = [],
  onKeysChanged,
  showToast,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState([
    'telemetry:write',
    'tournaments:read',
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedSecretData, setGeneratedSecretData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Accessibility refs for focus management
  const triggerButtonRef = useRef(null);
  const modalRef = useRef(null);
  const nameInputRef = useRef(null);

  const availableScopes = [
    { id: 'telemetry:write', label: 'telemetry:write (Record match events & stats)' },
    { id: 'tournaments:read', label: 'tournaments:read (Query brackets & rosters)' },
    { id: 'tournaments:manage', label: 'tournaments:manage (Advance rounds & scores)' },
    { id: 'games:read', label: 'games:read (Fetch game manifests & metadata)' },
    { id: 'analytics:read', label: 'analytics:read (Export aggregate player metrics)' },
  ];

  // Focus trap and Escape listener
  useEffect(() => {
    if (!showModal) return;

    // Focus first input on open
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        triggerButtonRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'input, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal]);

  const handleOpenModal = () => {
    setKeyName('');
    setSelectedScopes(['telemetry:write', 'tournaments:read']);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    triggerButtonRef.current?.focus();
  };

  const handleToggleScope = (scopeId) => {
    setErrorMessage('');
    setSelectedScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((s) => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) {
      setErrorMessage('Key name / purpose is required');
      nameInputRef.current?.focus();
      return;
    }
    if (selectedScopes.length === 0) {
      setErrorMessage('Please select at least one permission scope');
      return;
    }

    setIsCreating(true);
    setErrorMessage('');
    try {
      const res = await publisherService.createApiKey({
        name: keyName.trim(),
        scopes: selectedScopes,
      });

      setGeneratedSecretData(res);
      setShowModal(false);
      showToast?.('API Key generated successfully! Save your secret key now.', 'success');
      onKeysChanged?.();
      triggerButtonRef.current?.focus();
    } catch (err) {
      console.error('Failed to create API key:', err);
      setErrorMessage(err.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (key) => {
    if (
      !window.confirm(
        `Permanently revoke API key "${key.name}" (${key.key_id})? Services using this key will immediately lose access.`
      )
    ) {
      return;
    }

    try {
      await publisherService.revokeApiKey(key.id || key.key_id);
      showToast?.(`API key "${key.name}" revoked`, 'success');
      onKeysChanged?.();
    } catch (err) {
      console.error('Failed to revoke key:', err);
      showToast?.(err.message || 'Failed to revoke key', 'error');
    }
  };

  const handleCopySecret = async () => {
    if (!generatedSecretData?.secret) return;
    try {
      await navigator.clipboard.writeText(generatedSecretData.secret);
      setCopied(true);
      showToast?.('Secret copied to clipboard!', 'info');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      showToast?.('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="card api-keys-card mt-3" data-testid="api-key-manager-container">
      {/* Header */}
      <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>🔑 Studio API Keys & Telemetry Tokens</h3>
          <p className="text-muted" style={{ marginTop: '0.25rem', marginBottom: 0 }}>
            Authenticate your backend match servers, score coordinators, and telemetry hooks with PlayCarys.
          </p>
        </div>
        <button
          ref={triggerButtonRef}
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleOpenModal}
          data-testid="generate-key-trigger-btn"
        >
          ➕ Generate New Key
        </button>
      </div>

      {/* One-Time Secret Reveal Banner */}
      {generatedSecretData && (
        <div
          className="secret-reveal-banner mt-3"
          style={{
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
          }}
          data-testid="api-secret-reveal-banner"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: '#facc15', fontSize: '0.9rem' }}>
              ⚠️ New Secret Key Generated — Save Now
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setGeneratedSecretData(null)}
              style={{ color: 'var(--text-muted)' }}
              title="Dismiss warning"
            >
              ✕ Dismiss
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
            This secret key is hashed in storage and will <strong>never be shown again</strong>. If lost, you must revoke it and generate a new key.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <code
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '0.4rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                color: '#38bdf8',
                wordBreak: 'break-all',
                flex: 1,
              }}
              data-testid="raw-secret-token"
            >
              {generatedSecretData.secret}
            </code>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopySecret}
              data-testid="copy-secret-btn"
            >
              {copied ? '✅ Copied' : '📋 Copy Secret'}
            </button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      {apiKeys.length > 0 ? (
        <div className="table-responsive mt-3" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.6rem 0.5rem' }}>Key Name</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Public Key ID</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Authorized Scopes</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Created</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Last Used</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k.id || k.key_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{k.name}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <code style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{k.key_id}</code>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {(k.scopes || []).map((sc) => (
                        <span key={sc} className="badge badge-outline" style={{ fontSize: '0.65rem' }}>
                          {sc}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                    {k.created_at ? new Date(k.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--accent-red)' }}
                      onClick={() => handleRevokeKey(k)}
                      title="Revoke this API Key"
                    >
                      🗑️ Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(0, 0, 0, 0.15)', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
            No active API keys created yet. Generate a key to connect match servers or telemetry SDKs.
          </p>
        </div>
      )}

      {/* Creation Modal with Strict Viewport-Height Constraints & Persistent Footer */}
      {showModal && createPortal((
        <div
          className="modal-backdrop api-key-modal-backdrop"
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
          }}
          data-testid="api-key-modal-backdrop"
        >
          <div
            ref={modalRef}
            className="modal-content api-key-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="apiKeyModalTitle"
            aria-describedby="apiKeyModalDesc"
            style={{
              maxWidth: '520px',
              width: '100%',
              height: 'min(90dvh, 640px)',
              maxHeight: 'calc(100dvh - 2rem)',
              minHeight: 0,
              boxSizing: 'border-box',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-card, #1e293b)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
            data-testid="api-key-modal-dialog"
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div>
                <h3 id="apiKeyModalTitle" style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                  🔑 Generate Studio API Key
                </h3>
                <p id="apiKeyModalDesc" style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Creates scoped authentication credentials for telemetry and tournament hooks.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleCloseModal}
                aria-label="Close modal"
                style={{ fontSize: '1.2rem', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="apiKeyCreateForm"
              onSubmit={handleCreateKey}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  overflowY: 'auto',
                  flex: '1 1 auto',
                  minHeight: 0,
                }}
              >
                {errorMessage && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.6rem 0.8rem',
                      marginBottom: '1rem',
                      fontSize: '0.8rem',
                      color: '#f87171',
                    }}
                    role="alert"
                  >
                    ⚠️ {errorMessage}
                  </div>
                )}

                <div style={{ marginBottom: '1.2rem' }}>
                  <label
                    htmlFor="apiKeyNameInput"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.4rem',
                      fontWeight: 600,
                    }}
                  >
                    Key Name / Workload Description *
                  </label>
                  <input
                    ref={nameInputRef}
                    id="apiKeyNameInput"
                    type="text"
                    className="input"
                    placeholder="e.g. Production Match Coordinator"
                    value={keyName}
                    onChange={(e) => {
                      setKeyName(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    style={{ width: '100%' }}
                    data-testid="api-key-name-input"
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    A human-readable label to identify this service in audit logs.
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                    }}
                  >
                    Permission Scopes (Select at least one) *
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem',
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {availableScopes.map((sc) => (
                      <label
                        key={sc.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.6rem',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(sc.id)}
                          onChange={() => handleToggleScope(sc.id)}
                          style={{ marginTop: '0.15rem' }}
                          data-testid={`scope-checkbox-${sc.id}`}
                        />
                        <span style={{ color: selectedScopes.includes(sc.id) ? '#fff' : 'var(--text-secondary)' }}>
                          {sc.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Persistent Action Footer (Never clipped on small / short-height screens) */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.95)',
                  flexShrink: 0,
                  zIndex: 2,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCloseModal}
                  data-testid="api-key-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating}
                  data-testid="api-key-submit-btn"
                >
                  {isCreating ? 'Generating…' : 'Generate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

export default PublisherApiKeyManager;
