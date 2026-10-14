import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AuthContext from '../../context/AuthContext';
import { getDatabase } from '../../services/playerService';
import Toast from '../../components/common/Toast';
import '../../styles/player/community.css';

export function Community() {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = Number(user?.id || user?.user_id || 7);

  // Tab State ('groups' | 'teams')
  const initialTab = searchParams.get('tab') === 'teams' ? 'teams' : 'groups';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Groups & Teams Data
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [linkedMap, setLinkedMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupVisibility, setGroupVisibility] = useState('public');
  const [groupJoinMode, setGroupJoinMode] = useState('open');
  const [submittingGroup, setSubmittingGroup] = useState(false);

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [submittingTeam, setSubmittingTeam] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [submittingMember, setSubmittingMember] = useState(false);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, teamId: null });

  // Toast feedback
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Sync tab with URL search parameter
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load Groups
  const fetchGroups = async () => {
    try {
      const res = await api.get(`/groups?viewerId=${uid}`);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setGroups(list);
    } catch (err) {
      console.error('Failed to load groups:', err);
      showToast('Could not load groups from the backend.', 'error');
    }
  };

  // Load Linked Accounts for team members
  const fetchLinkedAccounts = async (teamList) => {
    const memberIds = [...new Set(teamList.flatMap((t) => (t.members || []).map((m) => m.user_id)))];
    const pairs = await Promise.all(
      memberIds.map(async (id) => {
        try {
          const res = await api.get(`/linked-accounts/player/${id}`);
          return [id, Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])];
        } catch (e) {
          return [id, []];
        }
      })
    );
    setLinkedMap(Object.fromEntries(pairs));
  };

  // Load Teams
  const fetchTeams = async () => {
    try {
      const res = await api.get(`/teams?playerId=${uid}`);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setTeams(list);
      await fetchLinkedAccounts(list);
    } catch (err) {
      console.error('Failed to load teams:', err);
      showToast('Could not load teams from the backend.', 'error');
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchTeams()]);
      if (isMounted) setLoading(false);
    };
    loadAll();
    return () => {
      isMounted = false;
    };
  }, [uid]);

  // Derived Groups
  const myGroups = groups.filter((g) => {
    const members = g.member_ids || [];
    return members.map(Number).includes(uid);
  });

  const discoverGroups = groups.filter((g) => {
    const members = g.member_ids || [];
    return !members.map(Number).includes(uid);
  });

  // Calculate Community Events stat
  const communityEventsCount = myGroups.reduce((acc, g) => acc + (g.tournament_count || 0), 0);

  // Eligible players from database for Add Member
  const db = getDatabase();
  const eligiblePlayers = (db.users || []).filter((u) => {
    const isPlayer = u.role_id === 4 || u.role === 'player';
    const notSelf = Number(u.user_id || u.id) !== uid;
    return isPlayer && notSelf;
  });

  // --- Handlers: Group ---
  const handleOpenCreateGroup = () => {
    setGroupName('');
    setGroupDesc('');
    setGroupVisibility('public');
    setGroupJoinMode('open');
    setShowCreateGroup(true);
  };

  const handleSubmitGroup = async (e) => {
    if (e) e.preventDefault();
    const trimmed = groupName.trim();
    if (!trimmed) {
      showToast('Give your group a name.', 'error');
      return;
    }
    try {
      setSubmittingGroup(true);
      const res = await api.post('/groups', {
        name: trimmed,
        desc: groupDesc.trim(),
        owner_id: uid,
        visibility: groupVisibility,
        join_mode: groupJoinMode,
      });
      setShowCreateGroup(false);
      showToast(`${res.name || trimmed} created! 🛡️`, 'success');
      const newId = res.group_id || res.id;
      if (newId) {
        window.location.href = `/pages/player/group-detail.html?id=${newId}`;
      } else {
        await fetchGroups();
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      showToast(err.message || 'Could not create the group.', 'error');
    } finally {
      setSubmittingGroup(false);
    }
  };

  // --- Handlers: Team ---
  const handleOpenCreateTeam = () => {
    setTeamName('');
    setShowCreateTeam(true);
  };

  const handleSubmitTeam = async (e) => {
    if (e) e.preventDefault();
    const trimmed = teamName.trim();
    if (!trimmed) {
      showToast('Give your team a name.', 'error');
      return;
    }
    try {
      setSubmittingTeam(true);
      await api.post('/teams', { name: trimmed, captain_id: uid });
      setShowCreateTeam(false);
      setTeamName('');
      showToast(`${trimmed} created! ⚔️`, 'success');
      await fetchTeams();
    } catch (err) {
      console.error('Failed to create team:', err);
      showToast(err.message || 'Could not create the team.', 'error');
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleOpenAddMember = (teamId) => {
    setActiveTeamId(teamId);
    if (eligiblePlayers.length > 0) {
      setSelectedPlayerId(String(eligiblePlayers[0].user_id || eligiblePlayers[0].id));
    } else {
      setSelectedPlayerId('');
    }
    setShowAddMember(true);
  };

  const handleSubmitAddMember = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPlayerId) {
      showToast('Please select a player to add.', 'error');
      return;
    }
    try {
      setSubmittingMember(true);
      await api.post(`/teams/${activeTeamId}/members?requesterId=${uid}`, {
        user_id: parseInt(selectedPlayerId, 10),
      });
      setShowAddMember(false);
      showToast('Teammate added.', 'success');
      await fetchTeams();
    } catch (err) {
      console.error('Failed to add teammate:', err);
      showToast(err.message || 'Could not add teammate.', 'error');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleRemoveMember = async (teamId, memberUserId) => {
    try {
      await api.del(`/teams/${teamId}/members/${memberUserId}?requesterId=${uid}`);
      showToast('Removed.', 'info');
      await fetchTeams();
    } catch (err) {
      console.error('Failed to remove member:', err);
      showToast(err.message || 'Could not remove member.', 'error');
    }
  };

  const handleConfirmDeleteTeam = async () => {
    const teamId = confirmDeleteModal.teamId;
    if (!teamId) return;
    try {
      await api.del(`/teams/${teamId}?requesterId=${uid}`);
      showToast('Team deleted.', 'info');
      setConfirmDeleteModal({ isOpen: false, teamId: null });
      await fetchTeams();
    } catch (err) {
      console.error('Failed to delete team:', err);
      showToast(err.message || 'Could not delete team.', 'error');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="community-page-content">
        {/* Hero Banner */}
        <div className="cm-hero">
          <div className="cm-hero-visual">🛡️</div>
          <div className="cm-eyebrow">
            <span className="cm-eyebrow-dot"></span> Play together
          </div>
          <h1>Community</h1>
          <p>
            Groups are player-run clubs that host their own Community tournaments. Teams are the squads you enter into any team-based tournament.
          </p>
          <div className="cm-hero-stats">
            <div>
              <div className="cm-stat-n" id="stat-groups">{myGroups.length}</div>
              <div className="cm-stat-l">My Groups</div>
            </div>
            <div>
              <div className="cm-stat-n" id="stat-teams">{teams.length}</div>
              <div className="cm-stat-l">My Teams</div>
            </div>
            <div>
              <div className="cm-stat-n" id="stat-tourn">{communityEventsCount}</div>
              <div className="cm-stat-l">Community Events</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="cm-tabs">
          <button
            type="button"
            className={`cm-tab ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => handleTabChange('groups')}
          >
            🛡️ Groups <span className="n" id="tabn-groups">{myGroups.length}</span>
          </button>
          <button
            type="button"
            className={`cm-tab ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => handleTabChange('teams')}
          >
            ⚔️ Teams <span className="n" id="tabn-teams">{teams.length}</span>
          </button>
        </div>

        {/* ══ GROUPS TAB ══ */}
        {activeTab === 'groups' && (
          <div id="tab-groups">
            <div className="sec-label">
              <div className="sec-label-title">My Groups</div>
              <button
                type="button"
                className="mini mini-primary"
                onClick={handleOpenCreateGroup}
              >
                + Create Group
              </button>
            </div>
            <div id="my-groups" className="cm-grid">
              {myGroups.length > 0 ? (
                myGroups.map((g) => {
                  const isOwner = Number(g.owner_id) === uid;
                  const isOfficer = Array.isArray(g.officer_ids) && g.officer_ids.map(Number).includes(uid);
                  const initial = (g.name || '?').slice(0, 2).toUpperCase();
                  const targetUrl = `/pages/player/group-detail.html?id=${g.group_id || g.id}`;

                  return (
                    <div
                      key={g.group_id || g.id}
                      className="cm-card"
                      onClick={() => {
                        window.location.href = targetUrl;
                      }}
                    >
                      <div className="cm-card-top">
                        <div className="cm-avatar">{initial}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="cm-name">{g.name}</div>
                          <div className="cm-sub">
                            <span className={`pill pill-${g.visibility || 'public'}`}>
                              {g.visibility === 'private' ? '🔒 Private' : '🌐 Public'}
                            </span>
                            {isOwner && <span className="pill pill-owner">👑 Owner</span>}
                            {isOfficer && <span className="pill pill-officer">⭐ Officer</span>}
                          </div>
                        </div>
                      </div>
                      <p className="cm-desc">{g.desc || 'No description yet.'}</p>
                      <div className="cm-foot">
                        <span>👥 {g.member_count ?? (g.member_ids || []).length} member{(g.member_count ?? (g.member_ids || []).length) === 1 ? '' : 's'}</span>
                        <span>🏆 {g.tournament_count || 0} event{(g.tournament_count || 0) === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="cm-empty">
                  <span className="ico">🛡️</span>
                  You haven't joined a group yet.
                  <div className="cta">
                    <button
                      type="button"
                      className="mini mini-primary"
                      onClick={handleOpenCreateGroup}
                    >
                      Create your first group
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="sec-label">
              <div className="sec-label-title">Discover</div>
            </div>
            <div id="all-groups" className="cm-grid">
              {discoverGroups.length > 0 ? (
                discoverGroups.map((g) => {
                  const initial = (g.name || '?').slice(0, 2).toUpperCase();
                  const targetUrl = `/pages/player/group-detail.html?id=${g.group_id || g.id}`;

                  return (
                    <div
                      key={g.group_id || g.id}
                      className="cm-card"
                      onClick={() => {
                        window.location.href = targetUrl;
                      }}
                    >
                      <div className="cm-card-top">
                        <div className="cm-avatar">{initial}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="cm-name">{g.name}</div>
                          <div className="cm-sub">
                            <span className={`pill pill-${g.visibility || 'public'}`}>
                              {g.visibility === 'private' ? '🔒 Private' : '🌐 Public'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="cm-desc">{g.desc || 'No description yet.'}</p>
                      <div className="cm-foot">
                        <span>👥 {g.member_count ?? (g.member_ids || []).length} member{(g.member_count ?? (g.member_ids || []).length) === 1 ? '' : 's'}</span>
                        <span>🏆 {g.tournament_count || 0} event{(g.tournament_count || 0) === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="cm-empty">
                  <span className="ico">🌐</span>
                  No other public groups to discover right now.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TEAMS TAB ══ */}
        {activeTab === 'teams' && (
          <div id="tab-teams">
            <div className="sec-label">
              <div className="sec-label-title">My Teams</div>
              <button
                type="button"
                className="mini mini-primary"
                onClick={handleOpenCreateTeam}
              >
                + Create Team
              </button>
            </div>
            <div id="my-teams" className="cm-grid">
              {teams.length > 0 ? (
                teams.map((t) => {
                  const isCaptain = Number(t.captain_id) === uid;
                  const members = t.members || [];
                  const capMember = members.find((m) => Number(m.user_id) === Number(t.captain_id));
                  const capName = capMember?.user_name || '?';
                  const linkedCount = members.filter((m) => (linkedMap[m.user_id] || []).length > 0).length;
                  const initial = (t.name || '?').slice(0, 2).toUpperCase();

                  return (
                    <div key={t.team_id || t.id} className="cm-card is-team">
                      <div className="cm-card-top">
                        <div className="cm-avatar team">{initial}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="cm-name">{t.name}</div>
                          <div className="cm-sub">
                            {isCaptain ? (
                              <span className="pill pill-cap">⭐ You captain</span>
                            ) : (
                              <span>Captain: {capName}</span>
                            )}
                            <span className="pill pill-ready">
                              {members.length} member{members.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="roster">
                        {members.map((m) => {
                          const links = linkedMap[m.user_id] || [];
                          const tooltip = links.length
                            ? links.map((l) => `${l.platform_label || 'Platform'}: ${l.in_game_name || 'Linked'}`).join(', ')
                            : 'No linked game account';

                          return (
                            <span key={m.user_id} className="chip">
                              {m.avatar || '🎮'} {m.user_name}
                              <span
                                className={links.length ? 'link-on' : 'link-off'}
                                title={tooltip}
                              >
                                🔗
                              </span>
                              {isCaptain && Number(m.user_id) !== Number(t.captain_id) && (
                                <span
                                  className="x"
                                  title="Remove teammate"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMember(t.team_id || t.id, m.user_id);
                                  }}
                                >
                                  ✕
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>

                      <div className="cm-foot">
                        <span>🔗 {linkedCount}/{members.length} linked a game account</span>
                      </div>

                      {isCaptain && (
                        <div className="cm-actions">
                          <button
                            type="button"
                            className="mini mini-ghost"
                            onClick={() => handleOpenAddMember(t.team_id || t.id)}
                          >
                            + Add Teammate
                          </button>
                          <button
                            type="button"
                            className="mini mini-danger"
                            onClick={() => setConfirmDeleteModal({ isOpen: true, teamId: t.team_id || t.id })}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="cm-empty">
                  <span className="ico">⚔️</span>
                  You're not on a team yet. Teams are how you enter team-based tournaments.
                  <div className="cta">
                    <button
                      type="button"
                      className="mini mini-primary"
                      onClick={handleOpenCreateTeam}
                    >
                      Create your first team
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE GROUP MODAL */}
      {showCreateGroup && (
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
          onClick={() => setShowCreateGroup(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: '460px',
              width: '100%',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem' }}>Create a Group</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                onClick={() => setShowCreateGroup(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitGroup}>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  id="g-name"
                  placeholder="e.g. Dragon Clan"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength="100"
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Description</label>
                <textarea
                  className="form-control bg-dark text-white border-secondary"
                  id="g-desc"
                  placeholder="What's this group about?"
                  rows="3"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                ></textarea>
              </div>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Visibility</label>
                <select
                  className="form-select bg-dark text-white border-secondary"
                  id="g-visibility"
                  value={groupVisibility}
                  onChange={(e) => setGroupVisibility(e.target.value)}
                >
                  <option value="public">🌐 Public — listed for anyone to find</option>
                  <option value="private">🔒 Private — hidden from browse</option>
                </select>
              </div>
              <div className="form-group mb-4">
                <label className="form-label text-white small fw-semibold">Who can join?</label>
                <select
                  className="form-select bg-dark text-white border-secondary"
                  id="g-joinmode"
                  value={groupJoinMode}
                  onChange={(e) => setGroupJoinMode(e.target.value)}
                >
                  <option value="open">Open — instant join</option>
                  <option value="request">Request — owner/officers approve</option>
                  <option value="invite_only">Invite-only — no self-serve join</option>
                </select>
              </div>
              <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm px-3"
                  disabled={submittingGroup}
                  onClick={() => setShowCreateGroup(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-yellow btn-sm px-4"
                  disabled={submittingGroup}
                >
                  {submittingGroup ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {showCreateTeam && (
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
          onClick={() => setShowCreateTeam(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: '420px',
              width: '100%',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem' }}>Create a Team</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                onClick={() => setShowCreateTeam(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitTeam}>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Team Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  id="tm-name"
                  placeholder="e.g. Phoenix Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength="80"
                  required
                />
              </div>
              <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                You'll be the captain. Add teammates after creating it — a team can enter a tournament once its roster matches that tournament's required size.
              </p>
              <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm px-3"
                  disabled={submittingTeam}
                  onClick={() => setShowCreateTeam(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-yellow btn-sm px-4"
                  disabled={submittingTeam}
                >
                  {submittingTeam ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showAddMember && (
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
          onClick={() => setShowAddMember(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: '420px',
              width: '100%',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem' }}>Add Teammate</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                onClick={() => setShowAddMember(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitAddMember}>
              <div className="form-group mb-4">
                <label className="form-label text-white small fw-semibold">Player</label>
                {eligiblePlayers.length > 0 ? (
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    id="am-player"
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                  >
                    {eligiblePlayers.map((u) => {
                      const pId = u.user_id || u.id;
                      return (
                        <option key={pId} value={pId}>
                          {u.user_name || u.username || `Player #${pId}`}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="text-muted small">No other players available to add.</div>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm px-3"
                  disabled={submittingMember}
                  onClick={() => setShowAddMember(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-yellow btn-sm px-4"
                  disabled={submittingMember || eligiblePlayers.length === 0}
                >
                  {submittingMember ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE TEAM MODAL */}
      {confirmDeleteModal.isOpen && (
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
          onClick={() => setConfirmDeleteModal({ isOpen: false, teamId: null })}
        >
          <div
            className="modal"
            style={{
              maxWidth: '400px',
              width: '100%',
              background: '#111827',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header d-flex justify-content-between align-items-center mb-2">
              <h4 className="text-white fw-bold mb-0" style={{ fontSize: '1.15rem' }}>Delete Team</h4>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                onClick={() => setConfirmDeleteModal({ isOpen: false, teamId: null })}
              >
                ✕
              </button>
            </div>
            <p className="text-muted mb-4" style={{ fontSize: '0.88rem' }}>
              Delete this team? This cannot be undone.
            </p>
            <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button
                type="button"
                className="btn btn-outline-light btn-sm px-3"
                onClick={() => setConfirmDeleteModal({ isOpen: false, teamId: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm px-3"
                onClick={handleConfirmDeleteTeam}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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

export default Community;
