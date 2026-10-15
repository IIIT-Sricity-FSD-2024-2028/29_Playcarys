import React from 'react';

export function SuperuserHubHero() {
  return (
    <div className="sa-hero">
      <h1>
        <span style={{ fontSize: '2rem' }}>⚡</span> Superuser Control Hub
      </h1>
      <p>
        Highest-level platform authority — unrestricted access across all modules,
        users, and configurations.
      </p>
      <div className="sa-hero-badges">
        <span className="badge badge-superuser">⚡ Superuser</span>
        <span className="badge badge-active">Full CRUD Access</span>
        <span className="badge badge-approved">System Control</span>
        <span className="badge badge-superuser">Admin Management</span>
      </div>
    </div>
  );
}

export default SuperuserHubHero;
