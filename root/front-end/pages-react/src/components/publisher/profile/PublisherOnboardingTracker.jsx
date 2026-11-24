import React from 'react';
import { Link } from 'react-router-dom';

export function PublisherOnboardingTracker({
  onboardingData,
}) {
  if (!onboardingData) return null;

  const {
    current_stage_index = 1,
    total_stages = 6,
    progress_percent = 17,
    publisher_type = 'individual',
    kyc_status = 'not_submitted',
    is_demo_data = false,
    badge_label = null,
    compliance_notice = null,
    can_publish = false,
    can_generate_keys = false,
    stages = [],
  } = onboardingData;

  // A browser must never be able to promote a publisher through KYC, payout,
  // or publishing eligibility. Those states belong to the server/review queue.

  const completedStages = stages.filter((stage) => stage.isCompleted).length;
  const submittedIdentity = ['review_pending', 'pending', 'verified'].includes(kyc_status);
  const safeProgress = submittedIdentity
    ? Math.min(progress_percent, Math.round((completedStages / total_stages) * 100))
    : Math.min(progress_percent, Math.round((Math.min(completedStages, 3) / total_stages) * 100));
  const hasEligibility = Boolean(can_publish && can_generate_keys && kyc_status === 'verified');

  const getKycBadge = () => {
    if (is_demo_data && kyc_status === 'verified') {
      return {
        cls: 'badge-warning',
        text: '🧪 Simulated Verification (Demo)',
      };
    }
    if (kyc_status === 'review_pending' || kyc_status === 'pending') {
      return {
        cls: 'badge-warning',
        text: '⏳ Identity Review Pending',
      };
    }
    if (kyc_status === 'rejected') {
      return {
        cls: 'badge-danger',
        text: '❌ Submission Action Required',
      };
    }
    if (kyc_status === 'verified') {
      return {
        cls: 'badge-active',
        text: '🟢 Identity Review Approved',
      };
    }
    return {
      cls: 'badge-disabled',
      text: '⚪ Identity Info Not Submitted',
    };
  };

  const kycBadge = getKycBadge();

  return (
    <div className="card onboarding-tracker-card" data-testid="onboarding-tracker-container">
      {/* Demo / Sandbox Banner */}
      {is_demo_data && (
        <div
          style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.78rem',
            color: '#facc15',
          }}
          data-testid="demo-data-badge"
        >
          <span>
            🔬 <strong>Demo Data / Simulated Verification:</strong> This account uses development fixture compliance records. Real-world KYC and payout integrations are simulated.
          </span>
          {badge_label && (
            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
              {badge_label}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>🚀 Publisher Onboarding & Compliance</h3>
            <span className="badge badge-publisher" style={{ textTransform: 'capitalize' }}>
              {publisher_type === 'organization' ? '🏢 Registered Studio / Org' : '👤 Individual Developer'}
            </span>
            <span className={`badge ${kycBadge.cls}`} data-testid="kyc-status-badge">
              {kycBadge.text}
            </span>
          </div>
          <p className="text-muted" style={{ marginTop: '0.25rem', marginBottom: 0 }}>
            {compliance_notice || '6-stage lifecycle for studio registration, identity compliance, and sandbox payout readiness.'}
          </p>
        </div>

        {/* Progress percent badge */}
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {safeProgress}%
          </span>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Stage {current_stage_index} of {total_stages}
          </div>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div
        className="progress-track"
        style={{ height: '10px', marginTop: '1rem', marginBottom: '1.5rem' }}
        role="progressbar"
        aria-valuenow={safeProgress}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          className="progress-fill fill-cyan"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      {/* Stage Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {stages.map((stg) => {
          // Do not let inconsistent fixture data visually mark KYC, payout, or
          // publishing as complete before identity review has actually passed.
          const requiresVerifiedIdentity = stg.index >= 4;
          const stageCompleted = Boolean(stg.isCompleted) && (!requiresVerifiedIdentity || kyc_status === 'verified');
          const stageCurrent = !stageCompleted && Boolean(stg.isCurrent);

          return (
          <div
            key={stg.id}
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${
                stageCurrent
                  ? 'var(--accent-cyan)'
                  : stageCompleted
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(255, 255, 255, 0.05)'
              }`,
              background: stageCurrent
                ? 'rgba(56, 189, 248, 0.08)'
                : stageCompleted
                ? 'rgba(34, 197, 94, 0.05)'
                : 'rgba(0, 0, 0, 0.2)',
            }}
            data-testid={`onboarding-stage-${stg.id}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                STAGE {stg.index}
              </span>
              <span style={{ fontSize: '0.75rem' }}>
                {stageCompleted ? '✅ Completed' : stageCurrent ? '⚡ In Progress' : '🔒 Pending'}
              </span>
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', marginBottom: '0.25rem' }}>
              {stg.title}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              {stg.description}
            </div>
          </div>
          );
        })}
      </div>

      {/* Action Strip */}
      <div
        style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <Link
          to="/publisher/onboarding"
          className="btn btn-secondary btn-sm"
          data-testid="view-full-application-btn"
        >
          📝 Complete Registration / Application
        </Link>

        <span
          className={`badge ${hasEligibility ? 'badge-active' : 'badge-warning'}`}
          title="Eligibility is decided by server-side checks and review, never by this page."
        >
          {hasEligibility ? 'Publishing eligibility confirmed' : 'Publishing eligibility under review'}
        </span>
      </div>
    </div>
  );
}

export default PublisherOnboardingTracker;
