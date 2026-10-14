import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import AuthContext from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import '../../styles/player/create-tournament.css';

const CreateTournament = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const addToast = (type, message) => {
    setToast({ type, message });
  };

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Type, Visibility, Team Mode
  const [kind, setKind] = useState('casual'); // 'casual' | 'community'
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [visibility, setVisibility] = useState('public'); // 'public' | 'private'
  const [teamMode, setTeamMode] = useState(false); // false = solo, true = team
  const [teamSize, setTeamSize] = useState(2);

  // Step 2: Game selection
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [isMulti, setIsMulti] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('score');
  const [stages, setStages] = useState([]);

  // Step 3: Details
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [prize, setPrize] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(16);

  // Step 4: Schedule
  const [regClose, setRegClose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Submit status
  const [submitting, setSubmitting] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState(null);

  const uid = user?.id || user?.user_id;

  // Helper to determine default format for a game
  const defaultFormatFor = (gId) => {
    if (teamMode) return 'bracket';
    const g = games.find((item) => (item.game_id || item.id) === Number(gId));
    if (g && (g.game_mode === 'multi' || g.mode === 'multi')) return 'bracket';
    return 'score';
  };

  // Load games on mount
  useEffect(() => {
    let isMounted = true;
    const fetchGames = async () => {
      try {
        setLoadingGames(true);
        const res = await API.get('/games');
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        const approved = list.filter((g) => {
          const appr = (g.game_approval_status || g.status || '').toLowerCase();
          const enab = g.game_status !== undefined ? g.game_status === 'enabled' : g.enabled !== false;
          return appr === 'approved' && enab;
        });
        if (isMounted) {
          setGames(approved);
          if (approved.length > 0) {
            const firstId = approved[0].game_id || approved[0].id;
            setSelectedGameId(firstId);
            setSelectedFormat(teamMode ? 'bracket' : ((approved[0].game_mode || approved[0].mode) === 'multi' ? 'bracket' : 'score'));
          }
        }
      } catch (err) {
        console.error('Failed to load games:', err);
        addToast('error', 'Failed to load approved games');
      } finally {
        if (isMounted) setLoadingGames(false);
      }
    };
    fetchGames();
    return () => {
      isMounted = false;
    };
  }, []);

  // When kind changes to community, load user's groups
  useEffect(() => {
    if (kind !== 'community') return;
    let isMounted = true;
    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);
        const res = await API.get('/groups?playerId=' + (uid || ''));
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        const filtered = list.filter((g) => {
          const isOwner = Number(g.owner_id || g.ownerId) === Number(uid);
          const isOfficer = Array.isArray(g.officer_ids) && g.officer_ids.map(Number).includes(Number(uid));
          return isOwner || isOfficer;
        });
        if (isMounted) {
          setGroups(filtered);
          if (filtered.length > 0) {
            setGroupId(filtered[0].id || filtered[0].group_id);
          } else {
            setGroupId('');
          }
        }
      } catch (err) {
        console.error('Failed to load groups:', err);
        addToast('error', 'Failed to load your groups');
      } finally {
        if (isMounted) setLoadingGroups(false);
      }
    };
    fetchGroups();
    return () => {
      isMounted = false;
    };
  }, [kind, uid]);

  // Adjust format when teamMode changes
  useEffect(() => {
    if (teamMode) {
      setSelectedFormat('bracket');
      if (stages.length > 0) {
        setStages(stages.map((s) => ({ ...s, format: 'bracket' })));
      }
    }
  }, [teamMode]);

  // When switching to multi-game festival, initialize 2 stages if empty
  const handleToggleMulti = (e) => {
    const checked = e.target.checked;
    setIsMulti(checked);
    if (checked && stages.length < 2 && games.length > 0) {
      const g1 = games[0].game_id || games[0].id;
      const g2 = games[1] ? (games[1].game_id || games[1].id) : g1;
      setStages([
        { game_id: g1, format: defaultFormatFor(g1), metric: 'score', direction: 'high', metric_label: 'Score', points_weight: 1 },
        { game_id: g2, format: defaultFormatFor(g2), metric: 'score', direction: 'high', metric_label: 'Score', points_weight: 1 }
      ]);
    }
  };

  const handleSelectGame = (gId) => {
    setSelectedGameId(gId);
    setSelectedFormat(defaultFormatFor(gId));
  };

  const handleAddStage = () => {
    if (games.length === 0) return;
    const gId = games[0].game_id || games[0].id;
    setStages([
      ...stages,
      { game_id: gId, format: defaultFormatFor(gId), metric: 'score', direction: 'high', metric_label: 'Score', points_weight: 1 }
    ]);
  };

  const handleRemoveStage = (idx) => {
    if (stages.length <= 2) {
      addToast('warning', 'A multi-game festival requires at least 2 stages');
      return;
    }
    const copy = [...stages];
    copy.splice(idx, 1);
    setStages(copy);
  };

  const handleStageChange = (idx, field, val) => {
    const copy = [...stages];
    copy[idx] = { ...copy[idx], [field]: val };
    if (field === 'game_id' && !copy[idx].format) {
      copy[idx].format = defaultFormatFor(val);
    }
    setStages(copy);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (kind === 'community') {
      if (groups.length === 0) {
        addToast('error', 'Pick a group you own or officer, or switch to Casual.');
        return false;
      }
      if (!groupId) {
        addToast('error', 'Please select a group.');
        return false;
      }
    }
    if (teamMode && (!teamSize || parseInt(teamSize, 10) < 2)) {
      addToast('error', 'Team size must be at least 2 players.');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (isMulti) {
      if (stages.length < 2) {
        addToast('error', 'Multi-game festival needs at least 2 stages.');
        return false;
      }
      for (let i = 0; i < stages.length; i++) {
        if (!stages[i].game_id) {
          addToast('error', `Stage #${i + 1} has no game selected.`);
          return false;
        }
      }
    } else {
      if (!selectedGameId) {
        addToast('error', 'Please pick a game.');
        return false;
      }
    }
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    if (!name.trim()) {
      addToast('error', 'Tournament name is required.');
      return false;
    }
    if (!desc.trim()) {
      addToast('error', 'Description is required.');
      return false;
    }
    if (!prize.trim()) {
      addToast('error', 'Prize details are required.');
      return false;
    }
    if (!maxParticipants || parseInt(maxParticipants, 10) < 2) {
      addToast('error', 'Max participants must be at least 2.');
      return false;
    }
    return true;
  };

  // Step 4 Validation
  const validateStep4 = () => {
    if (!regClose || !startDate || !endDate) {
      addToast('error', 'Please fill in all schedule dates.');
      return false;
    }
    const regCloseD = new Date(regClose);
    const startD = new Date(startDate);
    const endD = new Date(endDate);

    if (startD > endD) {
      addToast('error', 'End date cannot be earlier than start date.');
      return false;
    }
    if (regCloseD > startD) {
      addToast('error', 'Registration deadline must be before or equal to start date.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      return;
    }

    const payload = {
      organizer: parseInt(uid, 10),
      organizer_role: 'player',
      visibility: visibility,
      tournament_name: name.trim(),
      desc: desc.trim(),
      prize: prize.trim(),
      maxParticipants: parseInt(maxParticipants, 10) || 16,
      start_date: startDate,
      end_date: endDate,
      regClose: regClose,
    };

    if (kind === 'community') {
      payload.group_id = parseInt(groupId, 10);
    }

    if (teamMode) {
      payload.team_size = parseInt(teamSize, 10) || 2;
    }

    if (isMulti) {
      payload.type = 'multi';
      payload.games = stages.map((s, idx) => ({
        game_id: parseInt(s.game_id, 10),
        stage_order: idx + 1,
        format: s.format,
        metric: s.format === 'score' ? (s.metric || 'score') : undefined,
        direction: s.format === 'score' ? (s.direction || 'high') : undefined,
        metric_label: s.format === 'score' ? (s.metric_label || 'Score') : undefined,
        points_weight: parseFloat(s.points_weight) || 1,
      }));
    } else {
      payload.game_id = parseInt(selectedGameId, 10);
      payload.format = selectedFormat || defaultFormatFor(selectedGameId);
      if (payload.format === 'score') {
        payload.metric = 'score';
        payload.direction = 'high';
        payload.metric_label = 'Score';
      }
    }

    try {
      setSubmitting(true);
      const res = await API.post('/tournaments', payload);
      const created = res?.data ?? res;
      addToast('success', 'Tournament created successfully!');

      if (visibility === 'private' && created?.invite_code) {
        setCreatedInviteCode(created.invite_code);
      } else {
        setTimeout(() => {
          navigate('/player/tournaments');
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to create tournament:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to create tournament';
      addToast('error', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (createdInviteCode) {
      navigator.clipboard.writeText(createdInviteCode);
      addToast('success', 'Invite code copied to clipboard!');
    }
  };

  return (
    <div className="create-tournament-container">
      <button className="back-link-btn" onClick={() => navigate('/player/tournaments')} type="button">
        ← Cancel & Back to Tournaments
      </button>

      <div className="pub-header">
        <h1>Create Tournament</h1>
        <p>Launch a casual clash, an official group tournament, or a multi-game festival.</p>
      </div>

      {/* Step Rail Indicator */}
      <div className="step-rail">
        <div className={`step-node ${currentStep === 1 ? 'active' : currentStep > 1 ? 'done' : ''}`}>
          <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
          <span className="step-label">Type & Mode</span>
        </div>
        <div className={`step-line ${currentStep > 1 ? 'done' : ''}`} />
        <div className={`step-node ${currentStep === 2 ? 'active' : currentStep > 2 ? 'done' : ''}`}>
          <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
          <span className="step-label">Select Game(s)</span>
        </div>
        <div className={`step-line ${currentStep > 2 ? 'done' : ''}`} />
        <div className={`step-node ${currentStep === 3 ? 'active' : currentStep > 3 ? 'done' : ''}`}>
          <div className="step-circle">{currentStep > 3 ? '✓' : '3'}</div>
          <span className="step-label">Details</span>
        </div>
        <div className={`step-line ${currentStep > 3 ? 'done' : ''}`} />
        <div className={`step-node ${currentStep === 4 ? 'active' : currentStep > 4 ? 'done' : ''}`}>
          <div className="step-circle">{currentStep > 4 ? '✓' : '4'}</div>
          <span className="step-label">Schedule</span>
        </div>
      </div>

      {/* Invite Code Success Modal Overlay / Card (if private created) */}
      {createdInviteCode && (
        <div className="invite-code-card">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", color: '#fff', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            Private Tournament Created!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1rem' }}>
            Share this secret invite code with your friends or group members to let them join:
          </p>
          <div className="invite-code-display">
            <span className="invite-code-text">{createdInviteCode}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleCopyInviteCode} type="button">
              📋 Copy
            </button>
          </div>
          <div>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/player/tournaments')} type="button">
              Go to Tournaments →
            </button>
          </div>
        </div>
      )}

      {!createdInviteCode && (
        <div className="panel-card">
          {/* STEP 1: Type, Visibility, Team Mode */}
          {currentStep === 1 && (
            <div>
              <div className="section-title">1. Tournament Type</div>
              <div className="section-desc">
                Casual is a one-off open pickup anyone can join. Community tournaments belong to a Group you run.
              </div>
              <div className="toggle-row">
                <div
                  className={`toggle-opt ${kind === 'casual' ? 'selected' : ''}`}
                  onClick={() => setKind('casual')}
                >
                  <div className="t-icon">🎲</div>
                  <div className="t-title">Casual Clash</div>
                  <div className="t-sub">Open pickup, quick setup, perfect for spontaneous play or testing skills.</div>
                </div>
                <div
                  className={`toggle-opt ${kind === 'community' ? 'selected' : ''}`}
                  onClick={() => setKind('community')}
                >
                  <div className="t-icon">🛡️</div>
                  <div className="t-title">Community Group</div>
                  <div className="t-sub">Hosted under a group you own or officer. Group members get first dibs.</div>
                </div>
              </div>

              {kind === 'community' && (
                <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                  <label className="form-label">Select Host Group <span className="required">*</span></label>
                  {loadingGroups ? (
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>Loading your groups...</div>
                  ) : groups.length === 0 ? (
                    <div style={{ color: 'var(--accent-yellow)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>⚠️ You are not an owner or officer of any groups.</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setKind('casual')}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Switch to Casual
                      </button>
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                    >
                      {groups.map((g) => (
                        <option key={g.id || g.group_id} value={g.id || g.group_id}>
                          {g.group_name || g.name} (Role: {Number(g.owner_id || g.ownerId) === Number(uid) ? 'Owner' : 'Officer'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="section-title" style={{ marginTop: '1.5rem' }}>Visibility</div>
              <div className="section-desc">Decide whether this tournament is listed on the public browse board.</div>
              <div className="toggle-row">
                <div
                  className={`toggle-opt ${visibility === 'public' ? 'selected' : ''}`}
                  onClick={() => setVisibility('public')}
                >
                  <div className="t-icon">🌐</div>
                  <div className="t-title">Public</div>
                  <div className="t-sub">Listed on the discovery board. Any eligible player can browse and join.</div>
                </div>
                <div
                  className={`toggle-opt ${visibility === 'private' ? 'selected' : ''}`}
                  onClick={() => setVisibility('private')}
                >
                  <div className="t-icon">🔒</div>
                  <div className="t-title">Private / Invite-Only</div>
                  <div className="t-sub">Hidden from public browse; players require a join code to enter.</div>
                </div>
              </div>

              <div className="section-title" style={{ marginTop: '1.5rem' }}>Participation Mode</div>
              <div className="section-desc">Compete individually or assemble squads to battle together.</div>
              <div className="toggle-row">
                <div
                  className={`toggle-opt ${!teamMode ? 'selected' : ''}`}
                  onClick={() => setTeamMode(false)}
                >
                  <div className="t-icon">🧍</div>
                  <div className="t-title">Solo (1v1 / FFA)</div>
                  <div className="t-sub">Each player enters and competes individually.</div>
                </div>
                <div
                  className={`toggle-opt ${teamMode ? 'selected' : ''}`}
                  onClick={() => setTeamMode(true)}
                >
                  <div className="t-icon">👥</div>
                  <div className="t-title">Teams</div>
                  <div className="t-sub">Players register as pre-formed rosters and battle as squads.</div>
                </div>
              </div>

              {teamMode && (
                <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', maxWidth: '320px' }}>
                  <label className="form-label">Team Roster Size (Players per team) <span className="required">*</span></label>
                  <input
                    type="number"
                    className="form-input"
                    min="2"
                    max="10"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                  />
                  <div className="form-hint">Note: Team tournaments automatically run as knockout brackets.</div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Select Game(s) */}
          {currentStep === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div className="section-title" style={{ margin: 0 }}>2. Select Game(s)</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    id="multiGameToggle"
                    checked={isMulti}
                    onChange={handleToggleMulti}
                    style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Multi-Game Festival (Multi-Stage)
                </label>
              </div>
              <div className="section-desc">
                {!isMulti ? 'Select which approved game will be played for this tournament.' : 'Build a festival with multiple game stages.'}
              </div>

              {loadingGames ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                  Loading approved games...
                </div>
              ) : games.length === 0 ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-yellow)', fontSize: '0.88rem' }}>
                  ⚠️ No approved games found. Please contact an admin or support.
                </div>
              ) : !isMulti ? (
                <div>
                  <div className="game-select-grid">
                    {games.map((g) => {
                      const gId = g.game_id || g.id;
                      const isSel = Number(selectedGameId) === Number(gId);
                      return (
                        <div
                          key={gId}
                          className={`game-picker-card ${isSel ? 'selected' : ''}`}
                          onClick={() => handleSelectGame(gId)}
                        >
                          <img
                            src={g.game_banner || g.banner || g.cover_image || 'https://placehold.co/300x160/1a2235/white?text=Game'}
                            alt={g.game_title || g.title || 'Game'}
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/300x160/1a2235/white?text=Game';
                            }}
                          />
                          <div className="game-opt-name" title={g.game_title || g.title}>
                            {g.game_title || g.title}
                          </div>
                          <div className="game-opt-mode">
                            {(g.game_mode || g.mode || 'Single').toUpperCase()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <label className="form-label">Tournament Format <span className="required">*</span></label>
                    <select
                      className="form-select"
                      value={selectedFormat}
                      disabled={teamMode}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                    >
                      <option value="score">High-Score Leaderboard (Async / Single Player)</option>
                      <option value="bracket">Single Elimination Knockout Bracket</option>
                    </select>
                    {teamMode ? (
                      <div className="form-hint" style={{ color: 'var(--accent-yellow)' }}>
                        ℹ️ Team tournaments are locked to Knockout Bracket format.
                      </div>
                    ) : (
                      <div className="form-hint">
                        Smart default applied based on the selected game mode.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                    🏅 Multi-game festivals combine multiple game stages into one grand tournament. Points are awarded in each stage and totaled on the overall leaderboard.
                  </div>

                  {stages.map((stage, idx) => (
                    <div key={idx} className="stage-row">
                      <div className="stage-header">
                        <span className="stage-badge">Stage {idx + 1}</span>
                        {stages.length > 2 && (
                          <button
                            type="button"
                            className="stage-remove-btn"
                            onClick={() => handleRemoveStage(idx)}
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </div>
                      <div className="stage-fields-grid">
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Game</label>
                          <select
                            className="form-select"
                            value={stage.game_id}
                            onChange={(e) => handleStageChange(idx, 'game_id', e.target.value)}
                          >
                            {games.map((g) => (
                              <option key={g.game_id || g.id} value={g.game_id || g.id}>
                                {g.game_title || g.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Format</label>
                          <select
                            className="form-select"
                            value={stage.format}
                            disabled={teamMode}
                            onChange={(e) => handleStageChange(idx, 'format', e.target.value)}
                          >
                            <option value="score">Score Leaderboard</option>
                            <option value="bracket">Knockout Bracket</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Metric Label</label>
                          <input
                            type="text"
                            className="form-input"
                            value={stage.metric_label || 'Score'}
                            disabled={stage.format === 'bracket'}
                            onChange={(e) => handleStageChange(idx, 'metric_label', e.target.value)}
                            placeholder="e.g. Points, Kills"
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Weight</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            className="form-input"
                            value={stage.points_weight || 1}
                            onChange={(e) => handleStageChange(idx, 'points_weight', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '0.5rem' }}
                    onClick={handleAddStage}
                  >
                    + Add Another Stage
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Details */}
          {currentStep === 3 && (
            <div>
              <div className="section-title">3. Tournament Details</div>
              <div className="section-desc">Provide names, rules, prize information, and capacity limits.</div>

              <div className="form-group">
                <label className="form-label">Tournament Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Friday Night Smash Showdown #12"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description & Rules <span className="required">*</span></label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Provide instructions, rules, scoring criteria, and any stream links..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              <div className="form-2col">
                <div className="form-group">
                  <label className="form-label">Prize / Rewards <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ₹5,000 Cash Pool, In-Game Badges, Bragging Rights"
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {teamMode ? 'Max Teams *' : 'Max Entrants *'}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="2"
                    max="1024"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Schedule */}
          {currentStep === 4 && (
            <div>
              <div className="section-title">4. Schedule</div>
              <div className="section-desc">Set the registration window and the active tournament dates.</div>

              <div className="form-3col">
                <div className="form-group">
                  <label className="form-label">Registration Deadline <span className="required">*</span></label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={regClose}
                    onChange={(e) => setRegClose(e.target.value)}
                  />
                  <div className="form-hint">Registration closes at this time.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date & Time <span className="required">*</span></label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <div className="form-hint">Matches / Leaderboards open.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">End Date & Time <span className="required">*</span></label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <div className="form-hint">Tournament finishes; winners locked.</div>
                </div>
              </div>

              {visibility === 'private' && (
                <div className="invite-code-preview-note">
                  <span>🔒</span>
                  <div>
                    This is a <strong>Private Tournament</strong>. After clicking create, a secret invite code will be generated for you to distribute.
                  </div>
                </div>
              )}

              {/* Summary Review Box */}
              <div className="review-summary-box">
                <div className="review-summary-title">
                  <span>📋</span> Review Summary
                </div>
                <div className="review-grid">
                  <div>
                    <span className="review-item-label">Type:</span>
                    <span className="review-item-val">{kind === 'community' ? 'Community' : 'Casual'}</span>
                  </div>
                  <div>
                    <span className="review-item-label">Visibility:</span>
                    <span className="review-item-val">{visibility.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="review-item-label">Mode:</span>
                    <span className="review-item-val">{teamMode ? `Teams (${teamSize}v${teamSize})` : 'Solo'}</span>
                  </div>
                  <div>
                    <span className="review-item-label">Structure:</span>
                    <span className="review-item-val">{isMulti ? `Festival (${stages.length} stages)` : 'Single Game'}</span>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className="review-item-label">Name:</span>
                    <span className="review-item-val">{name || '—'}</span>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className="review-item-label">Prize:</span>
                    <span className="review-item-val">{prize || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pub-nav">
            {currentStep > 1 ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={submitting}
                onClick={handleBack}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleNext}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-green btn-lg"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Creating Tournament...' : '🏆 Create Tournament'}
              </button>
            )}
          </div>
        </div>
      )}

      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}
    </div>
  );
};

export default CreateTournament;
