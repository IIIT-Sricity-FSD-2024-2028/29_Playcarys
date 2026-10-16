import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="dash-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main className="page-wrapper" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="page-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem 2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎮</div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>404 - Page Not Found</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              The page you are looking for does not exist or has been moved.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link to="/publisher/dashboard" className="btn btn-primary">
                Publisher Dashboard
              </Link>
              <Link to="/superuser/dashboard" className="btn btn-ghost">
                Superuser Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NotFound;
