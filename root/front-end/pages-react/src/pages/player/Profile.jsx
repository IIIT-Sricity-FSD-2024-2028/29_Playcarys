import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import AuthContext from '../../context/AuthContext';
import { getDatabase, saveDatabase, hydrateFromServer } from '../../services/playerService';
import authService from '../../services/authService';
import Toast from '../../components/common/Toast';
import Avatar3DViewer from '../../components/player/profile/Avatar3DViewer';
import '../../styles/player/profile.css';

export function Profile() {
  const { user, setUser } = useContext(AuthContext);

  const [dbVersion, setDbVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Profile data & statistics
  const [profileData, setProfileData] = useState(null);
  const [avatarMode, setAvatarMode] = useState('loading'); // 'loading' | '3d' | 'fallback'

  // Server-based Game Achievements & Titles
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [lockedAchievements, setLockedAchievements] = useState([]);
  const [titles, setTitles] = useState([]);
  const [activeTitle, setActiveTitleState] = useState('');
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  // Linked accounts
  const [platforms, setPlatforms] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [linkingAccount, setLinkingAccount] = useState(false);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCurrentPassword, setEditCurrentPassword] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editErrors, setEditErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Report Player Form State
  const [reportUsername, setReportUsername] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportSession, setReportSession] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportErrors, setReportErrors] = useState({});
  const [submittingReport, setSubmittingReport] = useState(false);

  // Contact Moderator Form State
  const [modMessage, setModMessage] = useState('');
  const [modUrgency, setModUrgency] = useState('Medium');
  const [modMsgError, setModMsgError] = useState('');
  const [assignedMod, setAssignedMod] = useState(null);
  const [modButtonState, setModButtonState] = useState('idle'); // 'idle' | 'sent'

  // Determine current user ID canonical representation
  const uid = Number(user?.id || user?.user_id || user?.userId || 7);

  // 1. Calculate & load profile data from backend & DB
  const loadProfile = async () => {
    let curUser = null;
    let pp = null;
    try {
      const [uRes, pRes] = await Promise.all([
        api.get(`/users/${uid}`).catch(() => null),
        api.get(`/player-profiles/${uid}`).catch(() => null),
      ]);
      curUser = uRes;
      pp = pRes;
    } catch (e) {}

    const db = getDatabase();
    if (!curUser) {
      curUser =
        (db.users || []).find((u) => Number(u.id || u.user_id) === uid) ||
        (db.users || []).find((u) => (u.username || u.user_name) === user?.username) ||
        user;
    }
    if (!pp) {
      pp = (db.player_profiles || []).find((p) => Number(p.user_id) === uid);
    }
    let curTotal = pp ? pp.carys_points || 0 : 0;
    let lvl = 1;
    let req = 250;
    let cur = curTotal;
    while (cur >= req) {
      cur -= req;
      lvl++;
      req = 200 + Math.floor(Math.pow(lvl, 1.8) * 50);
    }
    const pct = Math.floor((cur / req) * 100);

    const uidStr = String(uid);
    const myResults = (db.match_results || []).filter((r) => String(r.player_id) === uidStr);
    const derivedWins = myResults.filter((r) => (r.result || '').toLowerCase() === 'win').length;
    const derivedLosses = myResults.filter(
      (r) => (r.result || '').toLowerCase() === 'loss' || (r.result || '').toLowerCase() === 'lose'
    ).length;
    const derivedMatches = myResults.length;

    const wins = typeof curUser.wins !== 'undefined' ? (curUser.wins || derivedWins) : (pp ? Math.max(derivedWins, pp.matches_won || 0) : derivedWins);
    const losses = typeof curUser.losses !== 'undefined' ? (curUser.losses || derivedLosses) : derivedLosses;
    const matches = typeof curUser.matches !== 'undefined' ? (curUser.matches || derivedMatches) : derivedMatches;
    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

    const currentLevel = curUser.level || lvl || 1;
    const avatar = curUser.avatar || (curUser.username || curUser.user_name || 'PL').slice(0, 2).toUpperCase();

    // PCP calculation
    const totalTourns = (db.tournaments || []).filter(
      (t) => t.registeredPlayers && t.registeredPlayers.map(String).includes(uidStr)
    ).length;
    const denom = matches + totalTourns;
    const pcpRaw = denom > 0 ? wins / denom : 0;
    const pcpScore = Math.min(100, Math.round(pcpRaw * 100));
    const pcpRank =
      pcpScore >= 80
        ? '🔥 Legendary'
        : pcpScore >= 60
        ? '💎 Diamond'
        : pcpScore >= 40
        ? '🥇 Gold'
        : pcpScore >= 20
        ? '🥈 Silver'
        : '🥉 Bronze';

    // Highlights
    const highlights = (db.highlights || [])
      .filter((h) => String(h.userId) === uidStr)
      .sort((a, b) => new Date(b.time) - new Date(a.time));

    setProfileData({
      user: curUser,
      username: curUser.username || curUser.user_name || 'Player',
      email: curUser.email || '',
      avatar,
      level: currentLevel,
      pct,
      matches,
      wins,
      losses,
      winRate,
      totalTourns,
      pcpScore,
      pcpRank,
      status: curUser.status || 'active',
      highlights,
    });
  };

  // 2. Load game achievements and titles from server
  const loadGameAchievements = async () => {
    try {
      setAchievementsLoading(true);
      const [aRes, tRes] = await Promise.all([
        api.get(`/players/${uid}/achievements`),
        api.get(`/players/${uid}/titles`),
      ]);
      const earned = Array.isArray(aRes) ? aRes : Array.isArray(aRes?.data) ? aRes.data : [];
      const titleList = Array.isArray(tRes?.titles) ? tRes.titles : [];
      setEarnedAchievements(earned);
      setTitles(titleList);

      const db = getDatabase();
      const pp = (db.player_profiles || []).find((p) => Number(p.user_id) === uid);
      setActiveTitleState(pp?.active_title || '');

      // Load locked achievements for played games
      const playedGameIds = [
        ...new Set(
          (db.match_results || [])
            .filter((r) => String(r.player_id) === String(uid))
            .map((r) => {
              if (r.game_id) return r.game_id;
              const session = (db.sessions || []).find((s) => String(s.session_id) === String(r.session_id));
              if (session?.game_id) return session.game_id;
              const match = (db.matches || []).find((m) => String(m.match_id) === String(r.session_id));
              return match?.game_id;
            })
            .concat(
              (db.matches || [])
                .filter((m) => Array.isArray(m.participants) && m.participants.some((p) => String(p) === String(uid)))
                .map((m) => m.game_id)
            )
            .filter((gid) => gid != null && gid !== '' && gid !== 'undefined' && !isNaN(Number(gid)))
            .map((gid) => Number(gid))
        ),
      ];
      const earnedIds = new Set(earned.map((a) => a.achievement_id));

      const lists = playedGameIds.length > 0
        ? await Promise.all(
            playedGameIds.map((gid) =>
              api
                .get(`/games/${gid}/achievements?viewerId=${uid}`)
                .then((res) => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
                .catch(() => [])
            )
          )
        : [];
      const locked = lists.flat().filter((a) => !a.unlocked && !earnedIds.has(a.achievement_id));
      setLockedAchievements(locked);
    } catch (err) {
      console.warn('Game achievements could not be loaded:', err);
    } finally {
      setAchievementsLoading(false);
    }
  };

  // 3. Load linked accounts & platforms
  const loadLinkedAccounts = async () => {
    try {
      const pRes = await api.get('/linked-accounts/platforms');
      const platformList = Array.isArray(pRes) ? pRes : Array.isArray(pRes?.data) ? pRes.data : [];
      setPlatforms(platformList);
      if (platformList.length > 0 && !selectedPlatform) {
        setSelectedPlatform(platformList[0].key);
      }

      const aRes = await api.get(`/linked-accounts/player/${uid}`);
      const accList = Array.isArray(aRes) ? aRes : Array.isArray(aRes?.data) ? aRes.data : [];
      setLinkedAccounts(accList);
    } catch (err) {
      console.warn('Could not load linked accounts:', err);
    }
  };

  // Hydrate DB tables from server on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await hydrateFromServer(['player_profiles', 'users', 'match_results', 'sessions', 'matches', 'games']);
        if (mounted) {
          setDbVersion((v) => v + 1);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [uid]);

  // On mount and when dbVersion changes
  useEffect(() => {
    loadProfile();
    loadGameAchievements();
    loadLinkedAccounts();
    setLoading(false);
  }, [uid, dbVersion]);

  // Handle active title selection
  const handleTitleChange = async (e) => {
    const newTitle = e.target.value;
    try {
      const res = await api.patch(`/players/${uid}/title`, {
        user_id: uid,
        title: newTitle || null,
      });
      const active = res.active_title || '';
      setActiveTitleState(active);
      const db = getDatabase();
      const pp = (db.player_profiles || []).find((p) => Number(p.user_id) === uid);
      if (pp) pp.active_title = active;
      saveDatabase(db);
      showToast(active ? `Title set: ${active}` : 'Title cleared.', 'success');
    } catch (err) {
      console.error('Failed to set title:', err);
      showToast(err.message || 'Could not set title.', 'error');
    }
  };

  // Handle link account
  const handleLinkAccount = async () => {
    const trimmed = inGameName.trim();
    if (!trimmed) {
      showToast('Enter your in-game name.', 'error');
      return;
    }
    try {
      setLinkingAccount(true);
      await api.post('/linked-accounts', {
        player_id: uid,
        platform: selectedPlatform,
        in_game_name: trimmed,
      });
      setInGameName('');
      showToast('Linked! 🔗', 'success');
      await loadLinkedAccounts();
    } catch (err) {
      console.error('Failed to link account:', err);
      showToast(err.message || 'Could not link that account.', 'error');
    } finally {
      setLinkingAccount(false);
    }
  };

  // Handle unlink account
  const handleUnlinkAccount = async (linkId) => {
    try {
      await api.del(`/linked-accounts/${linkId}?requesterId=${uid}`);
      showToast('Unlinked.', 'info');
      await loadLinkedAccounts();
    } catch (err) {
      console.error('Failed to unlink account:', err);
      showToast(err.message || 'Could not unlink account.', 'error');
    }
  };

  // --- Edit Profile Modal Form Handlers ---
  const handleOpenEditModal = () => {
    if (!profileData) return;
    setEditUsername(profileData.username);
    setEditEmail(profileData.email);
    setEditCurrentPassword('');
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    const errors = {};
    const uName = editUsername.trim();
    const mail = editEmail.trim();

    if (!uName) {
      errors.username = 'Username is required';
    } else if (uName.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (uName.length > 20) {
      errors.username = 'Username cannot exceed 20 characters';
    }

    if (!mail) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      errors.email = 'Please enter a valid email address';
    }

    const db = getDatabase();
    const curIdStr = String(uid);

    // Duplicate username check
    const dupUser = (db.users || []).find(
      (u) =>
        (u.username || u.user_name || '').toLowerCase() === uName.toLowerCase() &&
        String(u.id || u.user_id) !== curIdStr
    );
    if (dupUser) {
      errors.username = 'Username already taken';
    }

    // Duplicate email for role check
    const dupEmail = (db.users || []).find(
      (u) =>
        (u.email || '').toLowerCase() === mail.toLowerCase() &&
        (u.role === 'player' || u.role_id === 4) &&
        String(u.id || u.user_id) !== curIdStr
    );
    if (dupEmail) {
      errors.email = 'Another player account already uses this email';
    }

    // Password change validation
    if (editNewPassword) {
      if (!editCurrentPassword) {
        errors.currentPassword = 'Enter your current password to change it';
      }
      if (editNewPassword.length < 6) {
        errors.newPassword = 'New password must be at least 6 characters';
      }
      if (!editConfirmPassword) {
        errors.confirmPassword = 'Please confirm new password';
      } else if (editConfirmPassword !== editNewPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      setSavingProfile(true);

      // Verify and change password on backend FIRST if provided
      if (editNewPassword) {
        try {
          await api.post('/auth/change-password', {
            user_id: uid,
            current_password: editCurrentPassword,
            new_password: editNewPassword,
          });
        } catch (pwErr) {
          setEditErrors({
            currentPassword: pwErr.message || 'Current password is incorrect',
          });
          setSavingProfile(false);
          return;
        }
      }

      // Persist username + email changes to NestJS backend
      // PATCH /users/:id is admin-only, so we use PATCH /player-profiles/:id
      // for player_name and fall back to a db-import for the user record.
      try {
        await api.patch(`/player-profiles/${uid}`, { player_name: uName });
      } catch (patchErr) {
        console.warn('Could not patch player-profile on backend:', patchErr);
      }

      // Update local DB cache so the UI reflects the change immediately
      const db = getDatabase();
      const targetUser = (db.users || []).find((u) => String(u.id || u.user_id) === curIdStr);
      if (targetUser) {
        targetUser.user_name = uName;
        targetUser.username = uName;
        targetUser.email = mail;
        targetUser.avatar = uName.slice(0, 2).toUpperCase();
        delete targetUser.password;
      }

      const pp = (db.player_profiles || []).find((p) => String(p.user_id) === curIdStr);
      if (pp) {
        pp.player_name = uName;
      }

      saveDatabase(db);

      // Update session storage
      const session = authService.getSession() || {};
      session.username = uName;
      session.avatar = uName.slice(0, 2).toUpperCase();
      authService.setSession(session);
      if (setUser) setUser(session);

      setShowEditModal(false);
      showToast('Profile updated successfully!', 'success');
      setDbVersion((v) => v + 1);
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Report Player Form Handlers ---
  const handleSubmitReport = async (e) => {
    if (e) e.preventDefault();
    const errors = {};
    const pName = reportUsername.trim();
    const desc = reportDesc.trim();

    if (!pName) {
      errors.username = 'Player username is required';
    }
    if (!reportType) {
      errors.type = 'Please select a report type';
    }
    if (!desc) {
      errors.desc = 'Description is required';
    } else if (desc.length < 20) {
      errors.desc = 'Please provide more detail (min 20 characters)';
    }

    const db = getDatabase();
    const targetUser = (db.users || []).find(
      (u) => (u.username || u.user_name || '').toLowerCase() === pName.toLowerCase()
    );

    if (pName && !targetUser) {
      errors.username = 'User not found on this platform';
    } else if (targetUser && Number(targetUser.id || targetUser.user_id) === uid) {
      errors.username = 'You cannot report yourself';
    }

    if (Object.keys(errors).length > 0) {
      setReportErrors(errors);
      return;
    }

    setSubmittingReport(true);

    // POST report to NestJS backend
    const reportPayload = {
      reported_by: uid,
      reported_user: parseInt(targetUser.id || targetUser.user_id, 10),
      type: reportType,
      reason: desc,
      session: reportSession.trim() || undefined,
    };

    try {
      await api.post('/reports', reportPayload);
    } catch (reportErr) {
      console.warn('Backend report submission failed, falling back to local:', reportErr);
      // Fallback: persist to local DB so the moderator console can still read it
      const db = getDatabase();
      if (!db.reports) db.reports = [];
      db.reports.push({
        report_id: Math.floor(Math.random() * 1000000),
        ...reportPayload,
        status: 'pending',
        report_date: new Date().toISOString().slice(0, 10),
      });
      saveDatabase(db);
    }

    setReportUsername('');
    setReportType('');
    setReportSession('');
    setReportDesc('');
    setReportErrors({});
    setSubmittingReport(false);
    showToast('Report submitted. Our moderators will review it shortly.', 'success');
  };

  // --- Contact Moderator Form Handlers ---
  const handleContactModerator = async (e) => {
    if (e) e.preventDefault();
    setModMsgError('');
    const msg = modMessage.trim();
    if (msg.length < 15) {
      setModMsgError('Please provide at least 15 characters describing your concern.');
      return;
    }

    const db = getDatabase();
    const mods = (db.users || []).filter((u) => u.role === 'moderator' || u.role_id === 3);
    if (!mods.length) {
      showToast('No moderators are currently available. Please try again later.', 'error');
      return;
    }

    const mod = mods[Math.floor(Math.random() * mods.length)];

    // POST the moderator contact as a report to the backend
    const contactPayload = {
      reported_by: uid,
      reported_user: parseInt(mod.id || mod.user_id, 10),
      type: `Direct Contact [${modUrgency}]`,
      reason: msg,
      session: 'Player → Moderator',
    };

    try {
      await api.post('/reports', contactPayload);
    } catch (contactErr) {
      console.warn('Backend contact submission failed, falling back to local:', contactErr);
      const db2 = getDatabase();
      if (!db2.reports) db2.reports = [];
      db2.reports.push({
        report_id: Math.floor(Math.random() * 1000000),
        ...contactPayload,
        status: 'pending',
        report_date: new Date().toISOString().slice(0, 10),
        isDirectContact: true,
      });
      saveDatabase(db2);
    }
    // Update UI state to show assigned moderator and confirmation
    const mName = mod.username || mod.user_name;
    const mInitial = mod.avatar || mName.slice(0, 2).toUpperCase();
    setAssignedMod({ name: mName, initials: mInitial });

    setModButtonState('sent');
    showToast(`Message sent! Moderator ${mName} will review it shortly.`, 'success');

    setTimeout(() => {
      setModButtonState('idle');
      setModMessage('');
      setModUrgency('Medium');
    }, 3000);
  };

  if (loading || !profileData) {
    return <div className="page-wrapper p-4 text-center text-muted">Loading profile...</div>;
  }

  // Group earned achievements by game
  const earnedByGame = {};
  earnedAchievements.forEach((a) => {
    const gName = a.game_name || 'Game';
    if (!earnedByGame[gName]) earnedByGame[gName] = [];
    earnedByGame[gName].push(a);
  });

  const db = getDatabase();
  const gameNameOf = (gid) => {
    const g = (db.games || []).find((x) => String(x.game_id || x.id) === String(gid));
    return g ? g.game_name || g.title : 'Other';
  };

  return (
    <div className="page-wrapper">
      <div className="page-content" style={{ maxWidth: '1120px', margin: '0 auto', padding: '1.5rem' }}>
        <div className="page-header mb-4">
          <h1 style={{ fontFamily: "'Orbitron', monospace", color: '#fff', fontSize: '1.8rem', margin: '0 0 0.3rem' }}>
            Player Profile
          </h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
            Manage your identity and view performance
          </p>
        </div>

        <div className="profile-layout">
          {/* ================= LEFT SIDEBAR ================= */}
          <div className="profile-sidebar">
            {/* Identity Card */}
            <div className="card" style={{ position: 'relative', padding: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ position: 'absolute', top: '1rem', right: '1rem' }}
                onClick={handleOpenEditModal}
              >
                ✏️ Edit
              </button>

              <div className="profile-card-content">
                <Avatar3DViewer
                  userId={uid}
                  size={200}
                  autoRotate={true}
                  onStateChange={(state) => setAvatarMode(state)}
                />

                <div
                  className="avatar avatar-xl mb-2"
                  id="p-avatar"
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                    display: avatarMode === '3d' ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    fontWeight: 900,
                    color: '#fff',
                  }}
                >
                  {profileData.avatar}
                </div>
                <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem', color: '#fff' }}>
                  {profileData.username}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge bg-primary">Level {profileData.level}</span>
                  <span className="badge bg-success">🟢 Online</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{profileData.email}</div>

                {/* Level Progress */}
                <div style={{ width: '100%', marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <span>Level Progress</span>
                    <span>{profileData.pct}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${profileData.pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                        borderRadius: '99px',
                      }}
                    />
                  </div>
                </div>

                {/* Match Stats */}
                <div className="profile-stats-row">
                  <div>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                      {profileData.matches}
                    </div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Matches
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green, #10b981)' }}>
                      {profileData.wins}
                    </div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Wins
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-red, #ef4444)' }}>
                      {profileData.losses}
                    </div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Losses
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PlayCarys Points Card */}
            <div className="card pcp-card-vertical" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.4))' }}>
                🏅
              </div>
              <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.1rem', marginBottom: '0.25rem', color: '#fff' }}>
                PlayCarys Points
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                Your performance score based on wins and tournaments.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div
                    style={{
                      fontFamily: "'Orbitron', monospace",
                      fontSize: '1.8rem',
                      fontWeight: 900,
                      background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      lineHeight: 1,
                    }}
                  >
                    {profileData.pcpScore}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '0.4rem' }}>
                    PCP Score
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-yellow, #f59e0b)', lineHeight: 1 }}>
                    {profileData.pcpRank}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '0.4rem' }}>
                    Rank Tier
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT MAIN AREA ================= */}
          <div className="profile-main">
            {/* Stats + Achievements */}
            <div className="cards-grid-2">
              <div className="card" style={{ padding: '1.4rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.05rem', color: '#fff' }}>
                  🎯 Advanced Statistics
                </h3>
                <div>
                  <div className="stat-row">
                    <span className="label">Win Rate</span>
                    <span className="val" style={{ color: 'var(--accent-purple, #a78bfa)' }}>{profileData.winRate}%</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Total Matches</span>
                    <span className="val" style={{ color: 'var(--text-primary, #fff)' }}>{profileData.matches}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Current Level</span>
                    <span className="val" style={{ color: 'var(--text-primary, #fff)' }}>{profileData.level}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Tournaments</span>
                    <span className="val" style={{ color: 'var(--accent-yellow, #f59e0b)' }}>{profileData.totalTourns}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Account Status</span>
                    <span className="val" style={{ color: profileData.status === 'active' ? 'var(--accent-green, #10b981)' : 'var(--accent-red, #ef4444)' }}>
                      {profileData.status ? profileData.status.charAt(0).toUpperCase() + profileData.status.slice(1) : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trophies & Milestones */}
              <div className="card" style={{ padding: '1.4rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.05rem', color: '#fff' }}>
                  🏅 Trophies & Milestones
                </h3>
                <div>
                  {[
                    { icon: '🏆', name: 'First Victory', desc: 'Win your first match', condition: profileData.wins >= 1 },
                    { icon: '💎', name: '100 Wins', desc: 'Achieve 100 victories', condition: profileData.wins >= 100 },
                    { icon: '⭐', name: 'Level 50', desc: 'Reach level 50', condition: profileData.level >= 50 },
                    { icon: '🎖️', name: 'Tournament Champion', desc: 'Win a tournament', condition: false },
                    { icon: '🛡️', name: 'Veteran', desc: 'Play 200+ matches', condition: profileData.matches >= 200 },
                    { icon: '🎯', name: 'Win Streak', desc: 'Win 5 matches in a row', condition: profileData.wins >= 5 },
                  ].map((a, idx) => (
                    <div key={idx} className={`achievement ${a.condition ? 'unlocked' : ''}`}>
                      <div className="achievement-icon">{a.icon}</div>
                      <div className="achievement-info">
                        <h4>{a.name}</h4>
                        <p>{a.desc}</p>
                      </div>
                      {a.condition ? (
                        <span className="badge bg-success">Unlocked</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.75rem' }}>Locked</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Game Achievements Card */}
            <div className="card" style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: '#fff', margin: 0 }}>
                  🎖️ Game Achievements
                </h3>
                {titles.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Displayed title</label>
                    <select
                      className="form-select form-select-sm bg-dark text-white border-secondary"
                      value={activeTitle}
                      onChange={handleTitleChange}
                      style={{ width: 'auto' }}
                    >
                      <option value="">No title</option>
                      {titles.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {achievementsLoading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading achievements...</p>
              ) : Object.keys(earnedByGame).length === 0 && lockedAchievements.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No game achievements yet. Publishers can attach them to their games — play on to start collecting.
                </p>
              ) : (
                <div>
                  {/* Earned achievements */}
                  {Object.keys(earnedByGame).map((gName) => (
                    <div key={gName} style={{ marginBottom: '1.1rem' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 800, marginBottom: '0.5rem' }}>
                        {gName}
                      </div>
                      {earnedByGame[gName].map((a) => (
                        <div key={a.achievement_id || a.id} className="achievement unlocked" style={{ marginBottom: '0.45rem' }}>
                          <div className="achievement-icon">{a.icon || '🏆'}</div>
                          <div className="achievement-info">
                            <h4>
                              {a.name}
                              {a.title_awarded && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--accent-purple, #a78bfa)', fontWeight: 700 }}>
                                  {' '}· {a.title_awarded}
                                </span>
                              )}
                            </h4>
                            <p>{a.description || ''}</p>
                          </div>
                          <span className="badge bg-success">+{a.carys_granted || 0}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Locked achievements */}
                  {lockedAchievements.length > 0 && (
                    <div style={{ marginTop: '0.4rem', paddingTop: '0.9rem', borderTop: '1px dashed var(--border-primary, rgba(255,255,255,0.1))' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 800, marginBottom: '0.6rem' }}>
                        Still to earn · {lockedAchievements.length}
                      </div>
                      {lockedAchievements.map((a) => (
                        <div key={a.achievement_id || a.id} className="achievement" style={{ marginBottom: '0.45rem', opacity: 0.6 }}>
                          <div className="achievement-icon" style={{ filter: 'grayscale(1)' }}>{a.icon || '🏆'}</div>
                          <div className="achievement-info">
                            <h4>
                              {a.name}{' '}
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                · {gameNameOf(a.game_id)}
                              </span>
                            </h4>
                            <p>{a.description || ''}</p>
                          </div>
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                            +{a.carys_reward || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Linked Game Accounts Card */}
            <div className="card" style={{ padding: '1.4rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', fontSize: '1.05rem', color: '#fff' }}>
                🔗 Linked Game Accounts
              </h3>
              <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '1rem' }}>
                Self-declared, not verified — PlayCarys can't see into these games. This is just your roster so tournament organizers know your in-game name.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                {linkedAccounts.length > 0 ? (
                  linkedAccounts.map((l) => (
                    <div
                      key={l.link_id || l.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--bg-secondary, #1e293b)',
                        borderRadius: 'var(--radius-md, 8px)',
                        marginBottom: '0.4rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{l.platform_label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l.in_game_name}</div>
                      </div>
                      {l.launch_url && (
                        <a href={l.launch_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                          🚀 Launch
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => handleUnlinkAccount(l.link_id || l.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-muted" style={{ fontSize: '0.8rem', padding: '0.5rem 0' }}>
                    No linked accounts yet.
                  </div>
                )}
              </div>

              {/* Link form */}
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '1rem' }}>
                <div style={{ minWidth: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Platform</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                  >
                    {platforms.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>In-Game Name</label>
                  <input
                    type="text"
                    className="form-input form-input-sm"
                    placeholder="e.g. PhoenixRise#NA1"
                    value={inGameName}
                    onChange={(e) => setInGameName(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-yellow btn-sm"
                  disabled={linkingAccount}
                  onClick={handleLinkAccount}
                  style={{ height: '36px' }}
                >
                  {linkingAccount ? 'Linking...' : '+ Link'}
                </button>
              </div>
            </div>

            {/* Highlights Gallery */}
            {profileData.highlights && profileData.highlights.length > 0 && (
              <div className="card p-0 overflow-hidden" style={{ border: '1px solid var(--border-primary, rgba(255,255,255,0.08))', borderRadius: '12px' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-primary, rgba(255,255,255,0.08))' }}>
                  <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#fff' }}>📸 Highlights Gallery</h2>
                </div>
                <div style={{ display: 'flex', overflowX: 'auto', gap: '1rem', padding: '1.25rem', background: 'var(--bg-secondary, #1e293b)' }}>
                  {profileData.highlights.map((h, idx) => {
                    const g = (db.games || []).find((game) => String(game.game_id || game.id) === String(h.gameId));
                    const title = g ? g.game_name || g.title : 'Highlight';
                    const extra = h.distance ? `${h.distance}m` : '';
                    const dStr = h.time ? new Date(h.time).toLocaleDateString() : '';

                    return (
                      <div
                        key={idx}
                        style={{
                          flexShrink: 0,
                          width: '220px',
                          background: 'var(--bg-card, #111827)',
                          border: '1px solid var(--border-primary, rgba(255,255,255,0.08))',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }}
                      >
                        <img src={h.img} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} alt="Highlight" />
                        <div style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{title}</div>
                          {extra && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: "'Orbitron', monospace", marginTop: '0.2rem' }}>
                              {extra}
                            </div>
                          )}
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {dStr}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Support & Moderation Tools */}
            <div className="report-contact-grid">
              {/* Report a Player */}
              <div className="card report-half" style={{ padding: '1.4rem' }}>
                <h3 className="mb-1" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: '#fff' }}>
                  ⚠️ Report a Player
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.9rem' }}>
                  See someone cheating or behaving badly? Flag them here and our team will investigate.
                </p>
                <form onSubmit={handleSubmitReport} className="report-form">
                  <div className="form-group mb-2">
                    <label className="form-label">Player Username <span className="required">*</span></label>
                    <input
                      type="text"
                      className={`form-input ${reportErrors.username ? 'error' : ''}`}
                      placeholder="Their username"
                      value={reportUsername}
                      onChange={(e) => setReportUsername(e.target.value)}
                    />
                    {reportErrors.username && <span className="form-error">{reportErrors.username}</span>}
                  </div>
                  <div className="form-group mb-2">
                    <label className="form-label">Report Type <span className="required">*</span></label>
                    <select
                      className={`form-select ${reportErrors.type ? 'error' : ''}`}
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                    >
                      <option value="">Select type...</option>
                      <option>Toxic Behavior</option>
                      <option>Cheating</option>
                      <option>Griefing</option>
                      <option>Spam</option>
                      <option>Hate Speech</option>
                      <option>Other</option>
                    </select>
                    {reportErrors.type && <span className="form-error">{reportErrors.type}</span>}
                  </div>
                  <div className="form-group mb-2">
                    <label className="form-label">Session / Game</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Which game or session?"
                      value={reportSession}
                      onChange={(e) => setReportSession(e.target.value)}
                    />
                  </div>
                  <div className="form-group mb-3">
                    <label className="form-label">Description <span className="required">*</span></label>
                    <textarea
                      className={`form-textarea ${reportErrors.desc ? 'error' : ''}`}
                      placeholder="Describe what happened in detail..."
                      rows="3"
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                    />
                    {reportErrors.desc && <span className="form-error">{reportErrors.desc}</span>}
                  </div>
                  <button type="submit" className="btn btn-yellow w-100" disabled={submittingReport}>
                    {submittingReport ? 'Submitting...' : '⚠️ Submit Report'}
                  </button>
                </form>
              </div>

              {/* Contact Moderator */}
              <div className="card contact-mod-card" style={{ padding: '1.4rem' }}>
                <div className="mod-glow-blob" />
                <div className="mod-icon-wrap">🛡️</div>
                <h3 className="mod-title">Contact a Moderator</h3>
                <p className="mod-sub">
                  Need urgent help? Send your concern directly to an on-duty moderator. A random available moderator will be assigned.
                </p>

                {assignedMod && (
                  <div className="mod-assigned mb-3">
                    <div className="mod-assigned-label">Assigned to</div>
                    <div className="mod-assigned-name">
                      {assignedMod.initials} {assignedMod.name}
                    </div>
                  </div>
                )}

                <form onSubmit={handleContactModerator}>
                  <div className="form-group mb-2">
                    <label className="form-label">Your Message <span className="required">*</span></label>
                    <textarea
                      className={`form-textarea ${modMsgError ? 'error' : ''}`}
                      placeholder="Describe your concern clearly."
                      rows="3"
                      value={modMessage}
                      onChange={(e) => setModMessage(e.target.value)}
                    />
                    {modMsgError && <span className="form-error">{modMsgError}</span>}
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label">Urgency</label>
                    <select
                      className="form-select"
                      value={modUrgency}
                      onChange={(e) => setModUrgency(e.target.value)}
                    >
                      <option value="Low">🟢 Low — General inquiry</option>
                      <option value="Medium">🟡 Medium — Needs attention</option>
                      <option value="High">🔴 High — Urgent issue</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className={`btn w-100 mod-send-btn ${modButtonState === 'sent' ? 'btn-green' : 'btn-primary'}`}
                    disabled={modButtonState === 'sent'}
                  >
                    {modButtonState === 'sent' ? '✅ Message Sent!' : <><span className="mod-btn-icon">📡</span> Send to Moderator</>}
                  </button>

                  <div className="mod-note">
                    <span>🔒</span> Your message is confidential and reviewed within 24 hours.
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div
          className="modal-overlay show"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem', fontFamily: "'Orbitron', monospace" }}>✏️ Edit Profile</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="form-group mb-3">
                <label className="form-label">Username <span className="required">*</span></label>
                <input
                  type="text"
                  className={`form-input ${editErrors.username ? 'error' : ''}`}
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
                {editErrors.username && <span className="form-error">{editErrors.username}</span>}
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Email <span className="required">*</span></label>
                <input
                  type="email"
                  className={`form-input ${editErrors.email ? 'error' : ''}`}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                {editErrors.email && <span className="form-error">{editErrors.email}</span>}
              </div>

              <div className="password-change-box">
                <div className="password-box-title">
                  Change Password (Optional)
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className={`form-input form-input-sm ${editErrors.currentPassword ? 'error' : ''}`}
                    placeholder="Required to set a new password"
                    value={editCurrentPassword}
                    onChange={(e) => setEditCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  {editErrors.currentPassword && <span className="form-error">{editErrors.currentPassword}</span>}
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className={`form-input form-input-sm ${editErrors.newPassword ? 'error' : ''}`}
                    placeholder="Leave blank to keep current"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  {editErrors.newPassword && <span className="form-error">{editErrors.newPassword}</span>}
                </div>
                <div className="form-group mb-1">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className={`form-input form-input-sm ${editErrors.confirmPassword ? 'error' : ''}`}
                    placeholder="Repeat new password"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                  />
                  {editErrors.confirmPassword && <span className="form-error">{editErrors.confirmPassword}</span>}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm px-3"
                  disabled={savingProfile}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm px-4"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}
    </div>
  );
}

export default Profile;
