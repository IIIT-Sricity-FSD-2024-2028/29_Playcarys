import React, { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';

/**
 * Ensures the legacy avatar-3d.js script is loaded into the browser environment.
 */
function ensureAvatarScript() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.Avatar3D) return Promise.resolve(window.Avatar3D);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="/js/avatar-3d.js"]');
    if (existing) {
      if (window.Avatar3D) return resolve(window.Avatar3D);
      existing.addEventListener('load', () => resolve(window.Avatar3D));
      existing.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.src = '/js/avatar-3d.js';
    script.async = true;
    script.onload = () => resolve(window.Avatar3D || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * Check if WebGL is supported in the current environment.
 */
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch (e) {
    return false;
  }
}

export function Avatar3DViewer({
  userId,
  size = 220,
  autoRotate = true,
  onStateChange
}) {
  const containerRef = useRef(null);
  const [renderMode, setRenderMode] = useState('loading'); // 'loading' | '3d' | 'fallback'
  const [statusMessage, setStatusMessage] = useState('Loading avatar…');

  const uid = Number(userId || 7);

  useEffect(() => {
    let isCancelled = false;

    async function initAvatar() {
      if (!isWebGLAvailable()) {
        if (!isCancelled) {
          setRenderMode('fallback');
          setStatusMessage('WebGL not available');
          onStateChange?.('fallback');
        }
        return;
      }

      // Fetch cosmetics for current user from backend
      let equipped = [];
      try {
        const cat = await api.get(`/economy/catalogue?viewerId=${encodeURIComponent(uid)}`);
        equipped = (cat.items || []).filter((i) => i.is_equipped || i.equipped);
      } catch (err) {
        console.info('[Avatar3DViewer] cosmetics unavailable, falling back:', err);
        if (!isCancelled) {
          setRenderMode('fallback');
          setStatusMessage('Cosmetics unavailable');
          onStateChange?.('fallback');
        }
        return;
      }

      if (isCancelled) return;

      const body = equipped.find((i) => i.slot === 'body');
      if (!body || !body.model_url) {
        if (!isCancelled) {
          setRenderMode('fallback');
          setStatusMessage('No 3D body equipped');
          onStateChange?.('fallback');
        }
        return;
      }

      const avatar3d = await ensureAvatarScript();
      if (isCancelled || !avatar3d || !containerRef.current) {
        if (!isCancelled) {
          setRenderMode('fallback');
          setStatusMessage('3D engine unavailable');
          onStateChange?.('fallback');
        }
        return;
      }

      // Clear previous container content before mounting to prevent duplicates in Strict Mode
      avatar3d.unmount(containerRef.current);
      containerRef.current.innerHTML = '';

      try {
        const res = await avatar3d.mount(containerRef.current, {
          equipped,
          name: '',
          size,
          autoRotate
        });

        if (isCancelled) {
          avatar3d.unmount(containerRef.current);
          return;
        }

        if (res && res.mode === '3d') {
          setRenderMode('3d');
          onStateChange?.('3d');
        } else {
          setRenderMode('fallback');
          setStatusMessage(res?.reason || 'Using fallback avatar');
          onStateChange?.('fallback');
        }
      } catch (mountErr) {
        console.warn('[Avatar3DViewer] mount failed:', mountErr);
        if (!isCancelled) {
          setRenderMode('fallback');
          setStatusMessage('Failed to load avatar model');
          onStateChange?.('fallback');
        }
      }
    }

    initAvatar();

    return () => {
      isCancelled = true;
      if (containerRef.current && window.Avatar3D) {
        window.Avatar3D.unmount(containerRef.current);
      }
    };
  }, [uid, size, autoRotate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <div
        ref={containerRef}
        id="p-model"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: renderMode === '3d' ? 'block' : 'none',
          margin: '0 auto 0.5rem',
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden'
        }}
      />

      {renderMode === 'loading' && (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary, #8b96ad)',
            fontSize: '0.78rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px dashed var(--border-primary, rgba(255,255,255,0.1))',
            margin: '0 auto 0.5rem'
          }}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default Avatar3DViewer;
