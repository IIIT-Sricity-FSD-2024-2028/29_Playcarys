import React, { useState, useEffect } from 'react';
import { usePublisherAuth } from '../../hooks/usePublisherAuth';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchPublisherProfileSuite,
  fetchPublisherApiKeys,
  updatePublisherOnboarding,
  updatePublisherProfileDetails
} from '../../features/profiles/publisherProfileSlice';
import PublisherProfileCard from '../../components/publisher/profile/PublisherProfileCard';
import PublisherOnboardingTracker from '../../components/publisher/profile/PublisherOnboardingTracker';
import PublisherApiKeyManager from '../../components/publisher/profile/PublisherApiKeyManager';
import StudioStatistics from '../../components/publisher/profile/StudioStatistics';
import EditStudioModal from '../../components/publisher/profile/EditStudioModal';
import Toast from '../../components/common/Toast';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/publisher/profile.css';

export function Profile() {
  const dispatch = useAppDispatch();
  const {
    user,
    login,
    publisherId,
    isPublisher,
    authLoading
  } = usePublisherAuth();
  const userId = user?.userId || user?.id;
  const profileData = useAppSelector((state) => state.publisherProfile?.profileSuitesByUserId?.[String(userId)] || null);
  const onboardingData = useAppSelector((state) => state.publisherProfile?.profilesByUserId?.[String(userId)] || null);
  const apiKeys = useAppSelector((state) => state.publisherProfile?.apiKeysByUserId?.[String(userId)] || []);
  const suiteStatus = useAppSelector((state) => state.publisherProfile?.suiteStatus);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  function showToast(message, type = 'info') {
    setToast({ message, type });
  }

  // Load publisher profile, onboarding & API keys
  async function loadProfile() {
    if (!isPublisher || !userId) return;
    try {
      await dispatch(fetchPublisherProfileSuite(userId)).unwrap();
    } catch (err) {
      console.error('Failed to load publisher profile suite:', err);
      showToast('Could not load profile data', 'error');
    }
  }

  const reloadKeys = async () => {
    await dispatch(fetchPublisherApiKeys(userId)).unwrap();
  };

  const handleAdvanceStage = async (nextStage) => {
    try {
      const { profile: updated } = await dispatch(updatePublisherOnboarding({ userId, data: { stage: nextStage } })).unwrap();
      showToast(`Advanced to ${updated.current_stage}!`, 'success');
    } catch (err) {
      console.error('Failed to advance onboarding stage:', err);
      showToast(err.message || 'Failed to advance stage', 'error');
    }
  };

  useEffect(() => {
    if (!authLoading && isPublisher) {
      loadProfile();
    }
  }, [authLoading, isPublisher, userId]);

  // Handle saving edited details
  async function handleSaveProfile(updateData, onError) {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const { updatedUser } = await dispatch(updatePublisherProfileDetails({ userId, data: updateData })).unwrap();

      // Update AuthContext session so navbar and header update in real time
      if (login && updatedUser) {
        const newUsername = updatedUser.username || updatedUser.user_name || updateData.studioName;
        const newAvatar = updatedUser.avatar || newUsername.slice(0, 2).toUpperCase();
        login({
          ...user,
          username: newUsername,
          avatar: newAvatar
        });
      }

      showToast('Studio profile updated successfully!', 'success');
      setIsModalOpen(false);
      await loadProfile();
    } catch (err) {
      console.error('Failed to save profile:', err);
      if (onError) {
        onError(err);
      } else {
        showToast(err.message || 'Failed to update profile', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Auth Guard
  if (authLoading) {
    return <LoadingState message="Checking publisher credentials…" minHeight="60vh" />;
  }

  if (!isPublisher) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Publisher Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            You must be signed in with a publisher account to access this studio profile.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.href = '/index.html';
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (suiteStatus === 'loading' || !profileData) {
    return <LoadingState message="Loading studio profile…" minHeight="60vh" />;
  }

  return (
    <div className="page-content">
      {/* Toast notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}

      {/* Page Header */}
      <div className="page-header mb-3">
        <h1>Studio Profile & Settings</h1>
        <p className="text-muted">Manage studio compliance, onboarding, security, and developer API keys</p>
      </div>

      {/* Profile Card */}
      <PublisherProfileCard
        user={profileData.user}
        profile={profileData.profile}
        totalGames={profileData.totalGames}
        approvedGames={profileData.approvedGames}
        activeGames={profileData.activeGames}
        presence={profileData.presence}
        onEdit={() => setIsModalOpen(true)}
      />

      {/* ── 6-Stage Onboarding & Compliance Tracker ── */}
      <PublisherOnboardingTracker
        onboardingData={onboardingData}
        onAdvanceStage={handleAdvanceStage}
      />

      {/* ── Security & Statistics Grid ── */}
      <div className="cards-grid-2 mt-3">
        {/* Security Settings Card */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            🔒 Studio Security Settings
          </h3>

          <div className="security-box">
            <div>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                2-Step Verification <span className="coming-soon-badge">Coming Soon</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Protect your publisher account with hardware keys or authenticator apps.
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              Enable
            </button>
          </div>
        </div>

        {/* Studio Statistics Card */}
        <StudioStatistics
          avgRating={profileData.avgRating}
          totalViews={profileData.totalViews}
          totalSessions={profileData.totalSessions}
          tournamentsHosted={profileData.tournamentsHosted}
          revenuePcp={profileData.revenuePcp}
          joinDate={profileData.joinDate}
          status={profileData.status}
        />
      </div>

      {/* ── API Key Management ── */}
      <PublisherApiKeyManager
        apiKeys={apiKeys}
        userId={userId}
        onKeysChanged={reloadKeys}
        showToast={showToast}
      />

      {/* Edit Studio Details Modal */}
      <EditStudioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialUser={profileData.user}
        initialProfile={profileData.profile}
        onSave={handleSaveProfile}
        isSaving={isSaving}
      />
    </div>
  );
}

export default Profile;
