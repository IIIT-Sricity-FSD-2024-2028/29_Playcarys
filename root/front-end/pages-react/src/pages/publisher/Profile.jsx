import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import publisherService from '../../services/publisherService';
import PublisherProfileCard from '../../components/publisher/profile/PublisherProfileCard';
import StudioStatistics from '../../components/publisher/profile/StudioStatistics';
import EditStudioModal from '../../components/publisher/profile/EditStudioModal';
import Toast from '../../components/common/Toast';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/publisher/profile.css';

export function Profile() {
  const { user, loading: authLoading, login } = useContext(AuthContext);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  function showToast(message, type = 'info') {
    setToast({ message, type });
  }

  // Load publisher profile & statistics
  async function loadProfile() {
    if (!user || user.role !== 'publisher') return;
    setLoading(true);

    try {
      const uid = user.userId || user.id;
      const data = await publisherService.getPublisherFullProfile(uid);
      setProfileData(data);
    } catch (err) {
      console.error('Failed to load publisher profile:', err);
      showToast('Could not load profile data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user && user.role === 'publisher') {
      loadProfile();
    }
  }, [authLoading, user]);

  // Handle saving edited details
  async function handleSaveProfile(updateData, onError) {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const uid = user.userId || user.id;
      const { updatedUser } = await publisherService.updatePublisherProfile(uid, updateData);

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

  if (!user || user.role !== 'publisher') {
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

  if (loading || !profileData) {
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
        <h1>Studio Profile</h1>
        <p className="text-muted">Manage your publisher account and security settings</p>
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

      {/* Security & Statistics Grid */}
      <div className="cards-grid-2">
        {/* Security Settings Card */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            🔒 Security Settings
          </h3>

          <div className="security-box">
            <div>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                2-Step Verification <span className="coming-soon-badge">Coming Soon</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Protect your publisher account with an extra layer of security.
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
