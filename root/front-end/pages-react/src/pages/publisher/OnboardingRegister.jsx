import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePublisherAuth } from '../../hooks/usePublisherAuth';
import publisherService from '../../services/publisherService';
import Toast from '../../components/common/Toast';
import api from '../../services/api';

export function OnboardingRegister() {
  const navigate = useNavigate();
  const { user, isPublisher, authLoading } = usePublisherAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);

  // Form states
  const [publisherType, setPublisherType] = useState('individual'); // 'individual' | 'organization'
  const [studioName, setStudioName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('India');
  const [streetAddress, setStreetAddress] = useState('');
  const [orgRegNumber, setOrgRegNumber] = useState('');
  const [authorizedRep, setAuthorizedRep] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('sandbox_upi');
  const [payoutDestination, setPayoutDestination] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    async function loadData() {
      if (authLoading) return;
      if (!isPublisher) {
        navigate('/publisher');
        return;
      }

      try {
        const uid = user.userId || user.id || user.user_id;
        const data = await publisherService.getOnboardingStatus(uid);
        setOnboardingData(data);

        // Populate initial values
        setStudioName(user.username || user.user_name || '');
        setContactEmail(user.email || '');
        if (data.publisher_type) setPublisherType(data.publisher_type);
        if (data.kyc_status === 'review_pending' || data.kyc_status === 'verified') {
          setSubmittedSuccess(true);
        }
      } catch (err) {
        console.error('Failed to load onboarding:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [authLoading, isPublisher, user, navigate]);

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      showToast('You must accept the PlayCarys Distribution Agreement', 'error');
      return;
    }
    if (!legalName.trim()) {
      showToast('Legal full name or registered entity name is required', 'error');
      return;
    }
    if (publisherType === 'organization' && !orgRegNumber.trim()) {
      showToast('Organization registration / tax number is required for studios', 'error');
      return;
    }

    setSaving(true);
    try {
      const uid = user.userId || user.id || user.user_id;
      const res = await publisherService.updateOnboardingStatus(uid, {
        publisher_type: publisherType,
        legal_name: legalName.trim(),
        country,
        street_address: streetAddress.trim(),
        phone: phone.trim(),
        org_reg_number: orgRegNumber.trim(),
        authorized_rep: authorizedRep.trim(),
        terms_accepted: true,
        stage: 'identity_verified',
        kyc_status: 'review_pending',
        payout_method: payoutMethod,
        payout_destination: payoutDestination.trim(),
      });

      setOnboardingData(res);
      setSubmittedSuccess(true);
      showToast('Application submitted for review successfully!', 'success');
    } catch (err) {
      console.error('Submission failed:', err);
      showToast(err.message || 'Failed to submit application', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading publisher registration flow…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '860px', padding: '2rem 1rem' }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Breadcrumb / Return */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/publisher/profile" style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
          ← Back to Studio Profile
        </Link>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {import.meta.env.DEV && <aside className="demo-verification-panel">
          <strong>Demo verification</strong>
          <p>Submit your application, then simulate contact, identity and payment checks. No messages are sent and no bank account is verified.</p>
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              const result = await api.request('/publisher/demo-verification', 'POST');
              setOnboardingData(result);
              showToast('Demo checks completed. Publishing access is available; payments remain simulated.', 'success');
            } catch (error) { showToast(error.message, 'error'); }
            finally { setSaving(false); }
          }}>Simulate verification checks</button>
        </aside>}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>
            🏢 Publisher Registration & Identity Verification
          </h2>
          <p className="text-muted" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
            Submit developer and studio compliance details to unlock tournament hosting, game publication, and payout settlement.
          </p>
        </div>

        {/* Demo Data Notice */}
        {onboardingData?.is_demo_data && (
          <div
            style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              color: '#facc15',
              fontSize: '0.82rem',
            }}
          >
            🔬 <strong>Simulated Verification Environment:</strong> This demo workspace simulates the compliance verification queue. Submitted details are validated and stored locally without external banking verification.
          </div>
        )}

        {submittedSuccess && (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#4ade80' }}>
              ⏳ Identity Information Submitted for Review
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Your application has been received and entered the compliance queue. Stage status is currently: <strong>Review Pending</strong>. Once approved by staff or automated compliance rules, full publishing and API keys are unlocked.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmitApplication}>
          {/* Step 1: Publisher Classification */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#fff' }}>
              1. Developer / Publisher Type *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${publisherType === 'individual' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: publisherType === 'individual' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="pubType"
                  value="individual"
                  checked={publisherType === 'individual'}
                  onChange={() => setPublisherType('individual')}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>👤 Individual Developer</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Solo game creator, modder, or independent developer.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${publisherType === 'organization' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: publisherType === 'organization' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="pubType"
                  value="organization"
                  checked={publisherType === 'organization'}
                  onChange={() => setPublisherType('organization')}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>🏢 Registered Studio / Company</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Incorporated game studio, LLC, private limited, or publisher team.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Step 2: Contact Information */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#fff', fontSize: '0.95rem' }}>
              2. Studio & Contact Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Studio / Display Name *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Verified Contact Email *
                </label>
                <input
                  type="email"
                  className="input"
                  style={{ width: '100%' }}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Contact Phone (with Country Code) *
                </label>
                <input
                  type="tel"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Step 3: Legal & Entity Details */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#fff', fontSize: '0.95rem' }}>
              3. Legal Entity & Address Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Legal Full Name / Registered Entity *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Alex Morgan or Epic Games India Pvt Ltd"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Country of Incorporation / Residence *
                </label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Physical / Registered Business Address *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Street, City, State/Province, Postal Code"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  required
                />
              </div>

              {publisherType === 'organization' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Corporate Registration / CIN / Tax ID *
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="e.g. U72200KA2024PTC123456"
                      value={orgRegNumber}
                      onChange={(e) => setOrgRegNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Authorized Signatory / Representative *
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="Managing Director / Studio Lead"
                      value={authorizedRep}
                      onChange={(e) => setAuthorizedRep(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 4: Sandbox Payout Coordinates */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#fff', fontSize: '0.95rem' }}>
              4. Payout Settlement Coordinates (Sandbox Mode)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Payout Method
                </label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                >
                  <option value="sandbox_upi">UPI Virtual ID (Sandbox)</option>
                  <option value="sandbox_bank">Bank Account + IFSC (Sandbox)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Destination (UPI ID or Account|IFSC) *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. studio@upi or 1234567890|HDFC0001234"
                  value={payoutDestination}
                  onChange={(e) => setPayoutDestination(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Step 5: Terms & Agreements */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                fontSize: '0.82rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
                required
              />
              <span>
                I agree to the <strong>PlayCarys Publisher Distribution Terms</strong>, Virtual Goods Policy, and Fair Play Guidelines. I understand that all developer payouts and test deposits operate under sandbox rules until production compliance contracts are executed.
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/publisher/profile')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Submitting Application…' : 'Submit for Compliance Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OnboardingRegister;
