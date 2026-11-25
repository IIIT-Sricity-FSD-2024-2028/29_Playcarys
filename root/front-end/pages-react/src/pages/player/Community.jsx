import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import AuthContext from '../../context/AuthContext';
import { getDatabase, saveDatabase, sameId } from '../../services/playerService';
import { tournamentService, entrantCount, entrantName, isRegistered } from '../../services/tournamentService';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchGroups as loadGroups, fetchGroupById as loadGroupById } from '../../features/communities/groupSlice';
import { fetchTeams as loadTeams } from '../../features/communities/teamSlice';
import { selectAllGroups, selectAllTeams, selectGroupById, selectGroupsStatus, selectTeamsStatus } from '../../features/communities/selectors';
import Toast from '../../components/common/Toast';
import '../../styles/player/community.css';

export function Community() {
  const { user } = useContext(AuthContext);
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { groupId: paramGroupId, id: paramId, groupTab: paramGroupTab, tab: paramTab } = useParams();

  const uid = Number(user?.userId ?? user?.user_id ?? user?.id ?? 7);

  // Tab State ('groups' | 'teams')
  const initialTab = searchParams.get('tab') === 'teams' ? 'teams' : 'groups';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Selected Group for Detail View
  const rawGroupId = paramGroupId || paramId || searchParams.get('groupId') || searchParams.get('id');
  const initialGroupId = rawGroupId ? Number(rawGroupId) : null;
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const activeGroup = useAppSelector((state) =>
    selectedGroupId ? selectGroupById(state, selectedGroupId) : null
  );

  const rawTab = paramGroupTab || paramTab || searchParams.get('groupTab') || 'roster';
  const normalizedInitialTab = rawTab.toLowerCase().startsWith('tourn') ? 'tournaments' : rawTab;
  const [groupTab, setGroupTab] = useState(normalizedInitialTab);

  // Sync state if route parameters change
  useEffect(() => {
    if (paramGroupId || paramId) {
      const gid = Number(paramGroupId || paramId);
      if (gid && gid !== selectedGroupId) {
        setSelectedGroupId(gid);
      }
    }
    if (paramGroupTab || paramTab) {
      const t = (paramGroupTab || paramTab).toLowerCase();
      const norm = t.startsWith('tourn') ? 'tournaments' : t;
      if (norm !== groupTab) {
        setGroupTab(norm);
      }
    }
  }, [paramGroupId, paramId, paramGroupTab, paramTab]);

  // Groups & Teams Data
  const groups = useAppSelector(selectAllGroups);
  const teams = useAppSelector(selectAllTeams);
  const groupsStatus = useAppSelector(selectGroupsStatus);
  const teamsStatus = useAppSelector(selectTeamsStatus);
  const [linkedMap, setLinkedMap] = useState({});
  const loading = groupsStatus === 'loading' || teamsStatus === 'loading';

  // Group Detail - Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Group Detail - Requests state
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Group Detail - Tournaments state
  const [groupTournaments, setGroupTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  // Modals & Forms: Create Group
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupVisibility, setGroupVisibility] = useState('public');
  const [groupJoinMode, setGroupJoinMode] = useState('open');
  const [submittingGroup, setSubmittingGroup] = useState(false);

  // Modals & Forms: Edit Group Details
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupVisibility, setEditGroupVisibility] = useState('public');
  const [editGroupJoinMode, setEditGroupJoinMode] = useState('open');
  const [submittingEditGroup, setSubmittingEditGroup] = useState(false);

  // Tournament Edit state (for group owner/organizer)
  const [showEditTourn, setShowEditTourn] = useState(false);
  const [editTournId, setEditTournId] = useState(null);
  const [editTournName, setEditTournName] = useState('');
  const [editTournDesc, setEditTournDesc] = useState('');
  const [editTournPrize, setEditTournPrize] = useState('₹');
  const [editTournMax, setEditTournMax] = useState(16);
  const [editTournRegClose, setEditTournRegClose] = useState('');
  const [editTournStartDate, setEditTournStartDate] = useState('');
  const [editTournEndDate, setEditTournEndDate] = useState('');
  const [submittingEditTourn, setSubmittingEditTourn] = useState(false);

  // Tournament Manage state (for group owner/organizer)
  const [showManageTourn, setShowManageTourn] = useState(false);
  const [manageTourn, setManageTourn] = useState(null);
  const [manageMatches, setManageMatches] = useState([]);
  const [loadingBracket, setLoadingBracket] = useState(false);
  const [manageStageFilter, setManageStageFilter] = useState('all');

  // Team Modals
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [submittingTeam, setSubmittingTeam] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [submittingMember, setSubmittingMember] = useState(false);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, teamId: null });
  const [teamToManage, setTeamToManage] = useState(null);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editTeamId, setEditTeamId] = useState(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [submittingEditTeam, setSubmittingEditTeam] = useState(false);
  const [activeTeamChat, setActiveTeamChat] = useState(null);
  const [teamChatMessages, setTeamChatMessages] = useState([]);
  const [teamChatInput, setTeamChatInput] = useState('');
  const [loadingTeamChat, setLoadingTeamChat] = useState(false);
  const [sendingTeamChat, setSendingTeamChat] = useState(false);

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
      await dispatch(loadGroups({ viewerId: uid })).unwrap();
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
      const list = await dispatch(loadTeams({ playerId: uid })).unwrap();
      await fetchLinkedAccounts(list);
    } catch (err) {
      console.error('Failed to load teams:', err);
      showToast('Could not load teams from the backend.', 'error');
    }
  };

  // Load Specific Group Detail
  const fetchGroupDetail = async (gid) => {
    try {
      await dispatch(loadGroupById(gid)).unwrap();
    } catch (err) {
      console.error('Failed to load group detail:', err);
      showToast('Group not found.', 'error');
      setSelectedGroupId(null);
    }
  };

  // Load Chat for selected group
  const fetchChat = async (gid) => {
    try {
      setLoadingChat(true);
      const res = await api.get(`/groups/${gid}/chat`);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setChatMessages(list);
    } catch (e) {
      setChatMessages([]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Load Requests for selected group
  const fetchRequests = async (gid) => {
    try {
      setLoadingRequests(true);
      const res = await api.get(`/groups/${gid}/requests?requesterId=${uid}`);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setJoinRequests(list);
    } catch (e) {
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Load Tournaments for selected group
  const fetchGroupTournaments = async (gid) => {
    try {
      setLoadingTournaments(true);
      const res = await api.get(`/groups/${gid}/tournaments`);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      const dbInstance = getDatabase();
      const local = (dbInstance.tournaments || []).filter((t) => sameId(t.group_id, gid));
      const mergedMap = new Map();
      list.forEach((t) => mergedMap.set(String(t.tournament_id || t.id), t));
      local.forEach((t) => {
        const key = String(t.tournament_id || t.id);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, t);
        } else {
          mergedMap.set(key, { ...mergedMap.get(key), ...t });
        }
      });
      setGroupTournaments([...mergedMap.values()]);
    } catch (e) {
      const dbInstance = getDatabase();
      const local = (dbInstance.tournaments || []).filter((t) => sameId(t.group_id, gid));
      setGroupTournaments(local);
    } finally {
      setLoadingTournaments(false);
    }
  };

  const handleJoinCommunityTourn = async (t) => {
    const tid = t.tournament_id || t.id;
    if (t.team_size || t.visibility === 'private') {
      navigate(`/player/tournaments/${tid}?register=true`);
      return;
    }
    try {
      await tournamentService.registerSolo(tid, uid);
      showToast(`Registered for ${t.tournament_name || t.name}! 🏆`, 'success');
      fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Could not join tournament.', 'error');
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      await Promise.all([fetchGroups(), fetchTeams()]);
    };
    loadAll();
    return () => {
      isMounted = false;
    };
  }, [uid]);

  // Sync selected group and tab
  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetail(selectedGroupId);
    }
  }, [selectedGroupId]);

  // Sync sub-tabs in group detail view
  useEffect(() => {
    if (!selectedGroupId) return;
    if (groupTab === 'chat') fetchChat(selectedGroupId);
    if (groupTab === 'requests') fetchRequests(selectedGroupId);
    if (groupTab === 'tournaments') fetchGroupTournaments(selectedGroupId);
  }, [groupTab, selectedGroupId]);

  // Navigation handlers
  const handleSelectGroup = (gid, tab = 'roster') => {
    setSelectedGroupId(Number(gid));
    setGroupTab(tab);
    setSearchParams({ groupId: gid, groupTab: tab });
  };

  const handleBackToGroups = () => {
    setSelectedGroupId(null);
    setSearchParams({ tab: activeTab });
  };

  const handleGroupTabChange = (t) => {
    setGroupTab(t);
    setSearchParams({ groupId: selectedGroupId, groupTab: t });
  };

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

  // Eligible friends from database for Add Teammate modal
  const db = getDatabase();
  const activeTeamObj = (teams || []).find((t) => sameId(t.team_id || t.id, activeTeamId));
  const currentMemberIds = (activeTeamObj?.member_ids || []).map((m) => String(m?.user_id || m));

  const isFriendWithUser = (targetId) => {
    const curDb = getDatabase();
    return (curDb?.friendships || []).some(
      (f) =>
        !f.removed_at &&
        ((sameId(f.user_a, uid) && sameId(f.user_b, targetId)) ||
         (sameId(f.user_b, uid) && sameId(f.user_a, targetId)))
    );
  };

  const eligiblePlayers = (db.users || []).filter((u) => {
    const targetId = u.user_id || u.id;
    const isPlayer = u.role_id === 4 || u.role === 'player' || !u.role_id;
    const notSelf = !sameId(targetId, uid);
    const notOnTeam = !currentMemberIds.includes(String(targetId));
    return isPlayer && notSelf && notOnTeam && isFriendWithUser(targetId);
  });

  const pendingTeamInvites = (db?.notifications || []).filter(
    (n) =>
      sameId(n.toUser, uid) &&
      n.type === 'team_invite' &&
      n.status === 'pending' &&
      !n.read
  );

  // --- Handlers: Group Create & Edit ---
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
      await fetchGroups();
      if (newId) {
        handleSelectGroup(newId);
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      showToast(err.message || 'Could not create the group.', 'error');
    } finally {
      setSubmittingGroup(false);
    }
  };

  const handleOpenEditGroup = (g) => {
    setEditingGroupId(g.group_id || g.id);
    setEditGroupName(g.name || '');
    setEditGroupDesc(g.desc || '');
    setEditGroupVisibility(g.visibility || 'public');
    setEditGroupJoinMode(g.join_mode || 'open');
    setShowEditGroup(true);
  };

  const handleSubmitEditGroup = async (e) => {
    if (e) e.preventDefault();
    const trimmed = editGroupName.trim();
    if (!trimmed) {
      showToast('Give your group a name.', 'error');
      return;
    }
    try {
      setSubmittingEditGroup(true);
      const updated = await api.patch(`/groups/${editingGroupId}?requesterId=${uid}`, {
        name: trimmed,
        desc: editGroupDesc.trim(),
        visibility: editGroupVisibility,
        join_mode: editGroupJoinMode,
      });
      setShowEditGroup(false);
      showToast('Group details updated! 🛡️', 'success');
      await fetchGroups();
    } catch (err) {
      console.error('Failed to update group:', err);
      showToast(err.message || 'Could not update the group.', 'error');
    } finally {
      setSubmittingEditGroup(false);
    }
  };

  // --- Handlers: Group Actions (Membership & Officers) ---
  const handleJoinGroup = async (gid) => {
    try {
      const res = await api.post(`/groups/${gid}/join?userId=${uid}`);
      showToast(res.message || 'Joined group! 🛡️', 'success');
      await fetchGroupDetail(gid);
      await fetchGroups();
    } catch (e) {
      showToast(e.message || 'Failed to join group.', 'error');
    }
  };

  const handleLeaveGroup = async (gid) => {
    if (!window.confirm(`Leave ${activeGroup?.name || 'this group'}?`)) return;
    try {
      await api.post(`/groups/${gid}/leave?userId=${uid}`);
      showToast('Left the group.', 'info');
      await fetchGroupDetail(gid);
      await fetchGroups();
    } catch (e) {
      showToast(e.message || 'Failed to leave group.', 'error');
    }
  };

  const handlePromoteOfficer = async (userId) => {
    try {
      await api.post(`/groups/${selectedGroupId}/officers/${userId}?requesterId=${uid}`);
      showToast('Promoted to officer.', 'success');
      await fetchGroupDetail(selectedGroupId);
    } catch (e) {
      showToast(e.message || 'Failed to promote.', 'error');
    }
  };

  const handleDemoteOfficer = async (userId) => {
    try {
      await api.del(`/groups/${selectedGroupId}/officers/${userId}?requesterId=${uid}`);
      showToast('Officer removed.', 'info');
      await fetchGroupDetail(selectedGroupId);
    } catch (e) {
      showToast(e.message || 'Failed to demote.', 'error');
    }
  };

  const handleKickMember = async (userId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      await api.del(`/groups/${selectedGroupId}/members/${userId}?requesterId=${uid}`);
      showToast('Member removed.', 'info');
      await fetchGroupDetail(selectedGroupId);
    } catch (e) {
      showToast(e.message || 'Failed to remove member.', 'error');
    }
  };

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || !selectedGroupId) return;
    setChatInput('');
    try {
      await api.post(`/groups/${selectedGroupId}/chat`, { from_user: uid, body: text });
      await fetchChat(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Could not send message.', 'error');
    }
  };

  const handleRespondRequest = async (requestId, accept) => {
    try {
      await api.post(`/groups/${selectedGroupId}/requests/${requestId}/${accept ? 'accept' : 'reject'}?requesterId=${uid}`);
      showToast(accept ? 'Accepted.' : 'Declined.', 'success');
      await fetchGroupDetail(selectedGroupId);
      await fetchRequests(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Failed to respond to request.', 'error');
    }
  };

  // --- Handlers: Tournament Editing & Management ---
  const handleOpenEditTourn = (t) => {
    const tid = t.tournament_id || t.id;
    setEditTournId(tid);
    setEditTournName(t.tournament_name || t.name || '');
    setEditTournDesc(t.desc || '');
    let prizeVal = t.prize || '₹';
    if (!prizeVal.includes('₹') && prizeVal.trim() !== '') {
      prizeVal = '₹' + prizeVal;
    }
    setEditTournPrize(prizeVal);
    setEditTournMax(t.maxParticipants || 16);
    setEditTournRegClose((t.regClose || '').split('T')[0]);
    setEditTournStartDate((t.start_date || '').split('T')[0]);
    setEditTournEndDate((t.end_date || '').split('T')[0]);
    setShowEditTourn(true);
  };

  const handleToggleRupee = () => {
    if (editTournPrize.includes('₹')) {
      setEditTournPrize(editTournPrize.replace(/₹/g, '').trim());
    } else {
      setEditTournPrize('₹' + editTournPrize.trim());
    }
  };

  const handleSubmitEditTourn = async (e) => {
    if (e) e.preventDefault();
    const vName = editTournName.trim();
    const vDesc = editTournDesc.trim();
    let vPrize = editTournPrize.trim();
    const vMax = parseInt(editTournMax, 10);

    if (!vName) { showToast('Tournament name is required.', 'error'); return; }
    if (!vDesc) { showToast('Description is required.', 'error'); return; }
    if (!vPrize || vPrize === '₹') { showToast('Please enter a prize pool amount.', 'error'); return; }
    if (!vMax || vMax < 2) { showToast('Max participants must be at least 2.', 'error'); return; }
    if (editTournStartDate && editTournEndDate && new Date(editTournStartDate) > new Date(editTournEndDate)) {
      showToast('Start date cannot be after end date.', 'error'); return;
    }
    if (editTournRegClose && editTournStartDate && new Date(editTournRegClose) > new Date(editTournStartDate)) {
      showToast('Registration deadline must be before or on start date.', 'error'); return;
    }

    const payload = {
      tournament_name: vName,
      desc: vDesc,
      prize: vPrize,
      maxParticipants: vMax,
    };
    if (editTournRegClose) payload.regClose = editTournRegClose;
    if (editTournStartDate) payload.start_date = editTournStartDate;
    if (editTournEndDate) payload.end_date = editTournEndDate;

    try {
      setSubmittingEditTourn(true);
      await api.patch(`/tournaments/${editTournId}`, payload);
      setShowEditTourn(false);
      showToast('Tournament updated! 🏆', 'success');
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      console.error('Failed to update tournament:', err);
      showToast(err.message || 'Failed to update tournament.', 'error');
    } finally {
      setSubmittingEditTourn(false);
    }
  };

  const fetchBracket = async (tid) => {
    try {
      setLoadingBracket(true);
      const res = await api.get(`/tournaments/${tid}/bracket`);
      let list = res?.matches || (Array.isArray(res) ? res : []);
      if (!list || list.length === 0) {
        const dbInstance = getDatabase();
        list = (dbInstance.tournament_matches || []).filter((m) => sameId(m.tournamentId, tid));
      }
      setManageMatches(list);
    } catch (err) {
      const dbInstance = getDatabase();
      const local = (dbInstance.tournament_matches || []).filter((m) => sameId(m.tournamentId, tid));
      setManageMatches(local);
    } finally {
      setLoadingBracket(false);
    }
  };

  const handleOpenManageTourn = async (t) => {
    const tid = t.tournament_id || t.id;
    // Always guarantee tournament is in local DB and sanitized
    const dbInstance = getDatabase();
    if (!Array.isArray(dbInstance.tournaments)) dbInstance.tournaments = [];
    const idx = dbInstance.tournaments.findIndex((x) => sameId(x.tournament_id || x.id, tid));
    if (idx >= 0) {
      dbInstance.tournaments[idx] = { ...dbInstance.tournaments[idx], ...t };
    } else {
      dbInstance.tournaments.push({ ...t, tournament_id: parseInt(tid, 10) || tid });
    }
    saveDatabase(dbInstance);

    tournamentService.sanitizeTournamentMatches(tid);
    const updatedDb = getDatabase();
    const freshT = (updatedDb.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid)) || t;

    setManageTourn(freshT);
    setManageStageFilter('all');
    setShowManageTourn(true);
    await fetchBracket(tid);
  };

  const handleStartTournament = async (tid) => {
    if (!window.confirm('This will seed the bracket and close registration. Continue?')) return;
    try {
      // Ensure tournament exists in local DB before starting
      const dbInstance = getDatabase();
      if (!Array.isArray(dbInstance.tournaments)) dbInstance.tournaments = [];
      const exists = dbInstance.tournaments.some((x) => sameId(x.tournament_id || x.id, tid));
      if (!exists && manageTourn) {
        dbInstance.tournaments.push({ ...manageTourn, tournament_id: parseInt(tid, 10) || tid });
        saveDatabase(dbInstance);
      }
      await tournamentService.startTournament(tid, uid);
      showToast('Tournament Started! Bracket generated. 🚀', 'success');
      const updatedDb = getDatabase();
      const freshT = (updatedDb.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
      setManageTourn((prev) => (prev ? { ...prev, ...(freshT || {}), status: 'in-progress', currentRound: 1 } : prev));
      await fetchBracket(tid);
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Could not start tournament.', 'error');
    }
  };

  const handlePauseTournament = async (tid) => {
    try {
      await tournamentService.pauseTournament(tid);
      showToast('Tournament paused ⏸️', 'info');
      setManageTourn((prev) => (prev ? { ...prev, status: 'paused' } : prev));
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Failed to pause tournament.', 'error');
    }
  };

  const handleResumeTournament = async (tid) => {
    try {
      await tournamentService.resumeTournament(tid);
      showToast('Tournament resumed! ▶️', 'success');
      setManageTourn((prev) => (prev ? { ...prev, status: 'in-progress' } : prev));
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Failed to resume tournament.', 'error');
    }
  };

  const handleCancelTournament = async (tid) => {
    const reason = window.prompt('Enter cancellation reason (optional):', 'Cancelled by community organizer');
    if (reason === null) return;
    try {
      await tournamentService.cancelTournament(tid, reason);
      showToast('Tournament cancelled 🛑', 'info');
      setManageTourn((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Failed to cancel tournament.', 'error');
    }
  };

  const handleDeclareWinnerDirect = async (tid) => {
    const winnerName = window.prompt('Enter the winner name or ID:');
    if (!winnerName || !winnerName.trim()) return;
    try {
      await tournamentService.declareWinner(tid, winnerName.trim(), winnerName.trim());
      showToast(`Tournament completed! Winner: ${winnerName.trim()} 🏆`, 'success');
      setManageTourn((prev) => (prev ? { ...prev, status: 'completed', winner: winnerName.trim() } : prev));
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Failed to declare winner.', 'error');
    }
  };

  const handleExtendDeadlinePrompt = async (tid) => {
    const currentClose = manageTourn?.regClose ? manageTourn.regClose.slice(0, 16) : new Date().toISOString().slice(0, 16);
    const newDeadline = window.prompt('Enter new registration deadline (YYYY-MM-DDTHH:MM):', currentClose);
    if (!newDeadline || !newDeadline.trim()) return;
    try {
      await tournamentService.extendDeadline(tid, newDeadline.trim());
      showToast('Registration deadline extended! 📅', 'success');
      setManageTourn((prev) => (prev ? { ...prev, regClose: newDeadline.trim() } : prev));
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Failed to extend deadline.', 'error');
    }
  };

  const handleForceWinner = async (matchId, winnerId, winnerName) => {
    if (!window.confirm(`Declare ${winnerName} as the winner of this match?`)) return;
    try {
      // 1. Advance locally in DB immediately
      tournamentService.resolveDisputeWinner(matchId, winnerId);

      // 2. Also notify backend
      try {
        await api.post(`/tournaments/matches/${matchId}/resolve`, {
          organizer_id: uid,
          winner_id: winnerId,
        });
      } catch (errBackend) {
        console.warn('Backend match resolve notice:', errBackend?.message || errBackend);
      }

      showToast(`Winner recorded for ${matchId}: ${winnerName}! 🏆`, 'success');

      // Check if tournament was completed by this match
      const dbInstance = getDatabase();
      const updatedTourn = (dbInstance.tournaments || []).find((t) => sameId(t.tournament_id || t.id, manageTourn?.tournament_id || manageTourn?.id));
      if (updatedTourn?.winner) {
        setManageTourn((prev) => (prev ? { ...prev, winner: updatedTourn.winner, winner_id: updatedTourn.winner_id, status: updatedTourn.status } : prev));
      }

      if (manageTourn) {
        await fetchBracket(manageTourn.tournament_id || manageTourn.id);
      }
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Failed to resolve match.', 'error');
    }
  };

  const handleResetDispute = (matchId) => {
    tournamentService.resetDispute(matchId);
    showToast(`Match ${matchId} dispute cleared — match is ready to be played!`, 'success');
    if (manageTourn) {
      fetchBracket(manageTourn.tournament_id || manageTourn.id);
    }
  };

  const handleAdvanceRound = async (tid) => {
    const round = manageTourn?.currentRound || 1;
    const thisRound = manageMatches.filter((m) => Number(m.round) === Number(round));
    if (!thisRound.length) {
      showToast(`Round ${round} has no matches.`, 'warning');
      return;
    }
    const pending = thisRound.filter((m) => m.status !== 'completed' || !m.winnerId);
    if (pending.length > 0) {
      showToast(`${pending.length} match${pending.length > 1 ? 'es' : ''} in Round ${round} still need a declared winner. Use the 🏆 Win buttons below.`, 'warning');
      return;
    }
    const nextRound = manageMatches.filter((m) => Number(m.round) === Number(round) + 1);
    if (!nextRound.length) {
      const finalMatch = thisRound.find((m) => m.winnerId);
      if (!finalMatch || !finalMatch.winnerId) {
        showToast('Please select the Championship match winner first using 🏆 Win P1 or 🏆 Win P2 below.', 'warning');
        return;
      }
      const finalWinnerName = finalMatch.winner_name || (db.users || []).find((u) => sameId(u.id || u.user_id, finalMatch.winnerId))?.user_name || String(finalMatch.winnerId);
      if (!window.confirm(`Final round complete! Confirm ${finalWinnerName} as Tournament Champion?`)) return;
      try {
        await tournamentService.declareWinner(tid, finalMatch.winnerId, finalWinnerName);
        showToast(`Final round complete — tournament finished! Winner: ${finalWinnerName} 🏆`, 'success');
        setManageTourn((prev) => (prev ? { ...prev, status: 'completed', winner: finalWinnerName, winner_id: finalMatch.winnerId } : prev));
        await fetchBracket(tid);
        await fetchGroupTournaments(selectedGroupId);
      } catch (err) {
        showToast(err.message || 'Failed to complete tournament.', 'error');
      }
      return;
    }

    if (!window.confirm(`Advance to Round ${round + 1}?`)) return;
    const nextR = round + 1;
    const dbInstance = getDatabase();
    const t = (dbInstance.tournaments || []).find((x) => sameId(x.tournament_id || x.id, tid));
    if (t) {
      t.currentRound = nextR;
      saveDatabase(dbInstance);
    }
    setManageTourn((prev) => (prev ? { ...prev, currentRound: nextR } : prev));
    showToast(`Round ${nextR} is now live!`, 'success');
    await fetchBracket(tid);
  };

  const handleDeleteTournament = async (tid) => {
    if (!window.confirm('Are you sure you want to delete this tournament? This cannot be undone.')) return;
    try {
      await api.del(`/tournaments/${tid}`);
      showToast('Tournament deleted.', 'info');
      await fetchGroupTournaments(selectedGroupId);
    } catch (err) {
      showToast(err.message || 'Could not delete tournament.', 'error');
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
    const curDb = getDatabase();
    const targetTeam = (teams || []).find((t) => sameId(t.team_id || t.id, teamId));
    const memberIds = (targetTeam?.member_ids || []).map((m) => String(m?.user_id || m));

    const friends = (curDb.users || []).filter((u) => {
      const targetId = u.user_id || u.id;
      const isPlayer = u.role_id === 4 || u.role === 'player' || !u.role_id;
      const notSelf = !sameId(targetId, uid);
      const notOnTeam = !memberIds.includes(String(targetId));
      const friend = (curDb?.friendships || []).some(
        (f) =>
          !f.removed_at &&
          ((sameId(f.user_a, uid) && sameId(f.user_b, targetId)) ||
           (sameId(f.user_b, uid) && sameId(f.user_a, targetId)))
      );
      return isPlayer && notSelf && notOnTeam && friend;
    });

    if (friends.length > 0) {
      setSelectedPlayerId(String(friends[0].user_id || friends[0].id));
    } else {
      setSelectedPlayerId('');
    }
    setShowAddMember(true);
  };

  const handleSubmitAddMember = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPlayerId) {
      showToast('Please select a friend to invite.', 'error');
      return;
    }
    try {
      setSubmittingMember(true);
      const freshDb = getDatabase();
      const currentTeam = (teams || []).find((t) => sameId(t.team_id || t.id, activeTeamId)) ||
        (freshDb.teams || []).find((t) => sameId(t.team_id || t.id, activeTeamId));
      const teamName = currentTeam?.name || 'Squad';

      const targetFriend = (freshDb.users || []).find((u) => sameId(u.user_id || u.id, selectedPlayerId));
      const friendName = targetFriend?.user_name || targetFriend?.username || 'Friend';
      const captainName = user?.username || user?.user_name || 'Captain';

      const alreadyInvited = (freshDb.notifications || []).some(
        (n) =>
          n.type === 'team_invite' &&
          sameId(n.toUser, selectedPlayerId) &&
          sameId(n.team_id, activeTeamId) &&
          n.status === 'pending' &&
          !n.read
      );

      if (alreadyInvited) {
        showToast(`An invitation has already been sent to ${friendName}.`, 'info');
        setShowAddMember(false);
        return;
      }

      const inviteNotif = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        toRole: null,
        toUser: parseInt(selectedPlayerId, 10),
        from: captainName,
        avatar: '⚔️',
        fromRole: 'player',
        fromUserId: uid,
        type: 'team_invite',
        team_id: activeTeamId,
        team_name: teamName,
        msg: `${captainName} invited you to join team "${teamName}".`,
        time: 'Just now',
        created_at: new Date().toISOString(),
        read: false,
        status: 'pending',
        replies: []
      };

      if (!Array.isArray(freshDb.notifications)) freshDb.notifications = [];
      freshDb.notifications.unshift(inviteNotif);
      saveDatabase(freshDb);
      window.dispatchEvent(new Event('storage'));

      setShowAddMember(false);
      showToast(`Invitation sent to ${friendName}! They will be added once they accept.`, 'success');
    } catch (err) {
      console.error('Failed to invite friend:', err);
      showToast(err.message || 'Could not send invitation.', 'error');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleAcceptTeamInvite = async (inv) => {
    try {
      try {
        await api.post(`/teams/${inv.team_id}/members?requesterId=${inv.fromUserId}`, {
          user_id: uid,
        });
      } catch (apiErr) {
        console.warn('Backend add member warning:', apiErr);
      }

      const freshDb = getDatabase();
      if (Array.isArray(freshDb.teams)) {
        const targetTeam = freshDb.teams.find((t) => sameId(t.team_id || t.id, inv.team_id));
        if (targetTeam) {
          if (!Array.isArray(targetTeam.member_ids)) targetTeam.member_ids = [];
          if (!targetTeam.member_ids.some((m) => sameId(m, uid))) {
            targetTeam.member_ids.push(uid);
          }
        }
      }

      if (Array.isArray(freshDb.notifications)) {
        const notif = freshDb.notifications.find((n) => sameId(n.id, inv.id));
        if (notif) {
          notif.read = true;
          notif.status = 'accepted';
        }
      }
      saveDatabase(freshDb);
      window.dispatchEvent(new Event('storage'));

      showToast(`You joined team "${inv.team_name || 'Squad'}"! 🎉`, 'success');
      await fetchTeams();
    } catch (err) {
      console.error('Failed to accept team invite:', err);
      showToast(err.message || 'Could not join team.', 'error');
    }
  };

  const handleDeclineTeamInvite = (inv) => {
    try {
      const freshDb = getDatabase();
      if (Array.isArray(freshDb.notifications)) {
        const notif = freshDb.notifications.find((n) => sameId(n.id, inv.id));
        if (notif) {
          notif.read = true;
          notif.status = 'declined';
        }
      }
      saveDatabase(freshDb);
      window.dispatchEvent(new Event('storage'));
      showToast('Team invitation declined.', 'info');
      void fetchTeams();
    } catch (err) {
      console.error('Failed to decline team invite:', err);
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
      if (teamToManage && sameId(teamToManage.team_id || teamToManage.id, teamId)) {
        setTeamToManage(null);
      }
      await fetchTeams();
    } catch (err) {
      console.error('Failed to delete team:', err);
      showToast(err.message || 'Could not delete team.', 'error');
    }
  };

  // --- Handlers: Team Chat ---
  const fetchTeamChat = async (teamId) => {
    try {
      setLoadingTeamChat(true);
      const res = await api.get(`/teams/${teamId}/chat`);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      const dbInstance = getDatabase();
      const localMsgs = (dbInstance?.messages || [])
        .filter((m) => sameId(m.team_id, teamId))
        .map((m) => ({
          id: m.id,
          team_id: teamId,
          from_user: m.from_user,
          from_name: (dbInstance?.users || []).find((u) => sameId(u.id || u.user_id, m.from_user))?.user_name || `Player ${m.from_user}`,
          body: m.body,
          sent_at: m.sent_at
        }));
      const combined = [...list];
      localMsgs.forEach((lm) => {
        if (!combined.some((m) => sameId(m.id, lm.id))) {
          combined.push(lm);
        }
      });
      combined.sort((a, b) => Date.parse(a.sent_at || 0) - Date.parse(b.sent_at || 0));
      setTeamChatMessages(combined);
    } catch (e) {
      const dbInstance = getDatabase();
      const localMsgs = (dbInstance?.messages || [])
        .filter((m) => sameId(m.team_id, teamId))
        .map((m) => ({
          id: m.id,
          team_id: teamId,
          from_user: m.from_user,
          from_name: (dbInstance?.users || []).find((u) => sameId(u.id || u.user_id, m.from_user))?.user_name || `Player ${m.from_user}`,
          body: m.body,
          sent_at: m.sent_at
        }))
        .sort((a, b) => Date.parse(a.sent_at || 0) - Date.parse(b.sent_at || 0));
      setTeamChatMessages(localMsgs);
    } finally {
      setLoadingTeamChat(false);
    }
  };

  const handleOpenTeamChat = (team) => {
    setActiveTeamChat(team);
    setTeamChatInput('');
    fetchTeamChat(team.team_id || team.id);
  };

  const handleSendTeamChat = async (e) => {
    if (e) e.preventDefault();
    const text = teamChatInput.trim();
    if (!text || !activeTeamChat) return;
    const tid = activeTeamChat.team_id || activeTeamChat.id;
    setTeamChatInput('');
    setSendingTeamChat(true);
    try {
      try {
        await api.post(`/teams/${tid}/chat`, { from_user: uid, body: text });
      } catch (errBackend) {
        console.warn('Backend team chat fallback:', errBackend);
      }
      const dbInstance = getDatabase();
      if (!Array.isArray(dbInstance.messages)) dbInstance.messages = [];
      const newMsg = {
        id: Date.now(),
        from_user: uid,
        to_user: null,
        team_id: tid,
        body: text,
        sent_at: new Date().toISOString()
      };
      dbInstance.messages.push(newMsg);
      saveDatabase(dbInstance);
      await fetchTeamChat(tid);
    } catch (err) {
      showToast(err.message || 'Could not send message.', 'error');
    } finally {
      setSendingTeamChat(false);
    }
  };

  // --- Handlers: Team Manage & Edit ---
  const handleOpenManageTeam = (team) => {
    setTeamToManage(team);
  };

  const handleOpenEditTeam = (team) => {
    setEditTeamId(team.team_id || team.id);
    setEditTeamName(team.name || '');
    setShowEditTeam(true);
  };

  const handleSaveEditTeam = async (e) => {
    if (e) e.preventDefault();
    const trimmed = editTeamName.trim();
    if (!trimmed) {
      showToast('Team name cannot be empty.', 'error');
      return;
    }
    setSubmittingEditTeam(true);
    try {
      try {
        await api.patch(`/teams/${editTeamId}?requesterId=${uid}`, { name: trimmed });
      } catch (backendErr) {
        console.warn('Backend patch team fallback:', backendErr);
      }
      const dbInstance = getDatabase();
      if (Array.isArray(dbInstance.teams)) {
        const localTeam = dbInstance.teams.find((t) => sameId(t.team_id || t.id, editTeamId));
        if (localTeam) {
          localTeam.name = trimmed;
          saveDatabase(dbInstance);
        }
      }
      showToast('Team name updated!', 'success');
      setShowEditTeam(false);
      await fetchTeams();
      if (teamToManage && sameId(teamToManage.team_id || teamToManage.id, editTeamId)) {
        setTeamToManage((prev) => (prev ? { ...prev, name: trimmed } : prev));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update team.', 'error');
    } finally {
      setSubmittingEditTeam(false);
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    try {
      try {
        await api.del(`/teams/${teamId}/members/${uid}?requesterId=${uid}`);
      } catch (backendErr) {
        console.warn('Backend leave team fallback:', backendErr);
      }
      const dbInstance = getDatabase();
      if (Array.isArray(dbInstance.teams)) {
        const localTeam = dbInstance.teams.find((t) => sameId(t.team_id || t.id, teamId));
        if (localTeam) {
          localTeam.member_ids = (localTeam.member_ids || []).filter((id) => !sameId(id, uid));
          saveDatabase(dbInstance);
        }
      }
      showToast('You left the squad.', 'info');
      setTeamToManage(null);
      await fetchTeams();
    } catch (err) {
      showToast(err.message || 'Failed to leave team.', 'error');
    }
  };

  // Helper badge
  const renderStatusBadge = (status) => {
    const s = (status || 'upcoming').toLowerCase();
    if (s === 'in-progress') return <span className="pill pill-ready">In Progress</span>;
    if (s === 'completed') return <span className="pill pill-owner">Completed</span>;
    return <span className="pill pill-public">Upcoming</span>;
  };

  // Check staff role for active group
  const isActiveGroupOwner = activeGroup && (
    sameId(activeGroup.owner_id, uid) ||
    sameId(activeGroup.ownerId, uid) ||
    sameId(activeGroup.owner, uid)
  );
  const isActiveGroupStaff = activeGroup && (
    isActiveGroupOwner ||
    (activeGroup.officer_ids || []).some((oid) => sameId(oid, uid))
  );
  const isActiveGroupMember = activeGroup && (
    isActiveGroupStaff ||
    (activeGroup.member_ids || []).some((mid) => sameId(mid, uid))
  );

  return (
    <div className="page-wrapper">
      <div className="community-page-content">

        {/* ════════════════════════════════════════════════════════
            DETAIL VIEW: When a specific group is selected
        ════════════════════════════════════════════════════════ */}
        {selectedGroupId && activeGroup ? (
          <div>
            <button
              type="button"
              className="mini mini-ghost mb-3"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem' }}
              onClick={handleBackToGroups}
            >
              ← Back to Community Groups
            </button>

            {/* Group Detail Hero */}
            <div className="grp-detail-hero">
              <div className="grp-hero-avatar">
                {(activeGroup.name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.8rem', color: '#fff' }}>{activeGroup.name}</h1>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
                  {activeGroup.desc || 'No description yet.'}
                </p>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>👥 {activeGroup.member_count ?? (activeGroup.member_ids || []).length} members</span>
                  <span>🏆 {activeGroup.tournament_count || 0} tournaments</span>
                  <span className={`pill pill-${activeGroup.visibility || 'public'}`}>
                    {activeGroup.visibility === 'private' ? '🔒 Private' : '🌐 Public'}
                  </span>
                  <span>🚪 {activeGroup.join_mode === 'request' ? 'Request to Join' : activeGroup.join_mode === 'invite_only' ? 'Invite Only' : 'Open'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {isActiveGroupOwner && (
                  <>
                    <span className="pill pill-owner" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>👑 You own this group</span>
                    <button
                      type="button"
                      className="mini mini-primary"
                      onClick={() => handleOpenEditGroup(activeGroup)}
                    >
                      ✏️ Edit Details
                    </button>
                  </>
                )}
                {isActiveGroupMember && !isActiveGroupOwner && (
                  <button
                    type="button"
                    className="mini mini-danger"
                    onClick={() => handleLeaveGroup(activeGroup.group_id || activeGroup.id)}
                  >
                    Leave Group
                  </button>
                )}
                {!isActiveGroupMember && (
                  <button
                    type="button"
                    className="mini mini-primary"
                    disabled={activeGroup.join_mode === 'invite_only'}
                    onClick={() => handleJoinGroup(activeGroup.group_id || activeGroup.id)}
                  >
                    {activeGroup.join_mode === 'request' ? '📥 Request to Join' : activeGroup.join_mode === 'invite_only' ? '🔒 Invite Only' : '✅ Join Group'}
                  </button>
                )}
              </div>
            </div>

            {/* Group Detail Sub-tabs */}
            <div className="g-tabs">
              <button
                type="button"
                className={`g-tab ${groupTab === 'roster' ? 'active' : ''}`}
                onClick={() => handleGroupTabChange('roster')}
              >
                👥 Roster
              </button>
              <button
                type="button"
                className={`g-tab ${groupTab === 'chat' ? 'active' : ''}`}
                onClick={() => handleGroupTabChange('chat')}
              >
                💬 Chat
              </button>
              <button
                type="button"
                className={`g-tab ${groupTab === 'tournaments' ? 'active' : ''}`}
                onClick={() => handleGroupTabChange('tournaments')}
              >
                🏆 Tournaments
              </button>
              {isActiveGroupStaff && (
                <button
                  type="button"
                  className={`g-tab ${groupTab === 'requests' ? 'active' : ''}`}
                  onClick={() => handleGroupTabChange('requests')}
                >
                  📥 Join Requests
                </button>
              )}
            </div>

            {/* TAB: ROSTER */}
            {groupTab === 'roster' && (
              <div>
                {(activeGroup.members || (activeGroup.member_ids || []).map((id) => {
                  const u = (db.users || []).find((x) => Number(x.id || x.user_id) === Number(id));
                  return {
                    user_id: id,
                    user_name: u?.user_name || `Player ${id}`,
                    avatar: u?.avatar || '🎮',
                    role: Number(id) === Number(activeGroup.owner_id) ? 'owner' : (activeGroup.officer_ids || []).map(Number).includes(Number(id)) ? 'officer' : 'member',
                  };
                })).map((m) => (
                  <div key={m.user_id} className="member-row">
                    <div className="member-avatar">{m.avatar || '🎮'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{m.user_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {m.role === 'owner' ? '👑 Owner' : m.role === 'officer' ? '⭐ Officer' : 'Member'}
                      </div>
                    </div>
                    {isActiveGroupOwner && m.role !== 'owner' && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {m.role !== 'officer' ? (
                          <button
                            type="button"
                            className="mini mini-ghost"
                            onClick={() => handlePromoteOfficer(m.user_id)}
                          >
                            Make Officer
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="mini mini-ghost"
                            onClick={() => handleDemoteOfficer(m.user_id)}
                          >
                            Remove Officer
                          </button>
                        )}
                        <button
                          type="button"
                          className="mini mini-danger"
                          onClick={() => handleKickMember(m.user_id)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB: CHAT */}
            {groupTab === 'chat' && (
              <div>
                {!isActiveGroupMember ? (
                  <div className="cm-empty">
                    <span className="ico">🔒</span>
                    Join this group to access and participate in the group chat.
                  </div>
                ) : (
                  <div>
                    <div className="chat-box">
                      {chatMessages.length > 0 ? (
                        chatMessages.map((msg, i) => (
                          <div
                            key={msg.id || i}
                            className={`chat-msg ${Number(msg.from_user) === uid ? 'mine' : ''}`}
                          >
                            <div className="who">{msg.from_name || `Player ${msg.from_user}`}</div>
                            <div>{msg.body}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No messages yet. Say hello! 👋
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary"
                        placeholder="Message the group…"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        maxLength={500}
                      />
                      <button type="submit" className="mini mini-primary px-4">
                        Send
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB: TOURNAMENTS */}
            {groupTab === 'tournaments' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                    Tournaments in {activeGroup.name}
                  </div>
                  {isActiveGroupStaff && (
                    <button
                      type="button"
                      className="mini mini-primary"
                      onClick={() => navigate(`/player/create-tournament?groupId=${activeGroup.group_id || activeGroup.id}`)}
                    >
                      + New Community Tournament
                    </button>
                  )}
                </div>

                {groupTournaments.length > 0 ? (
                  groupTournaments.map((t) => {
                    const tid = t.tournament_id || t.id;
                    const isOwnerOrOrganizer =
                      isActiveGroupOwner ||
                      isActiveGroupStaff ||
                      sameId(t.organizer, uid) ||
                      sameId(t.organizer_id, uid) ||
                      sameId(t.created_by, uid) ||
                      (activeGroup?.officer_ids || []).some((oid) => sameId(oid, uid));
                    const gameObj = (db.games || []).find((g) => Number(g.id || g.game_id) === Number(t.game_id));
                    const gameName = gameObj?.game_name || t.game_name || (t.type === 'multi' ? 'Multi-game fest' : 'Knockout');
                    const entrants = entrantCount(t, db);

                    return (
                      <div
                        key={tid}
                        className="member-row"
                        style={{
                          borderLeftColor: 'var(--accent-cyan)',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '1rem 1.25rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                            flexShrink: 0,
                          }}
                        >
                          🏆
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff' }}>
                              {t.tournament_name || t.name}
                            </span>
                            {renderStatusBadge(t.status)}
                            {t.visibility === 'private' && (
                              <span className="pill pill-private">🔒 Private</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                            <span>🎮 {gameName}</span>
                            <span>💰 {t.prize || 'No prize pool'}</span>
                            <span>👥 {entrants}/{t.maxParticipants} entrants</span>
                            {t.start_date && (
                              <span>📅 {new Date(t.start_date).toLocaleDateString()}</span>
                            )}
                          </div>
                          {t.desc && (
                            <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem', lineHeight: 1.3 }}>
                              {t.desc}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {isOwnerOrOrganizer && (
                            <>
                              <button
                                type="button"
                                className="mini mini-primary"
                                onClick={() => handleOpenManageTourn(t)}
                              >
                                ⚙️ Manage
                              </button>
                              <button
                                type="button"
                                className="mini mini-ghost"
                                onClick={() => handleOpenEditTourn(t)}
                              >
                                ✏️ Edit
                              </button>
                              {t.status !== 'in-progress' && (
                                <button
                                  type="button"
                                  className="mini mini-danger"
                                  onClick={() => handleDeleteTournament(tid)}
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </>
                          )}
                          {/* Member Join / Status Button */}
                          {isRegistered(t, uid, db) ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: 'var(--accent-green)',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              ✓ Joined
                            </span>
                          ) : t.status === 'upcoming' ? (
                            <button
                              type="button"
                              className="mini mini-primary"
                              onClick={() => handleJoinCommunityTourn(t)}
                            >
                              ⚡ Join
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="mini mini-ghost"
                            onClick={() => navigate(`/player/tournaments/${tid}`)}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="cm-empty">
                    <span className="ico">🏆</span>
                    No Community tournaments hosted yet.
                    {isActiveGroupStaff && (
                      <div className="cta">
                        <button
                          type="button"
                          className="mini mini-primary"
                          onClick={() => navigate(`/player/create-tournament?groupId=${activeGroup.group_id || activeGroup.id}`)}
                        >
                          Create the first tournament
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: REQUESTS */}
            {groupTab === 'requests' && isActiveGroupStaff && (
              <div>
                {joinRequests.length > 0 ? (
                  joinRequests.map((r) => (
                    <div key={r.id} className="member-row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{r.user_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          Requested on {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="mini mini-primary"
                          onClick={() => handleRespondRequest(r.id, true)}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="mini mini-danger"
                          onClick={() => handleRespondRequest(r.id, false)}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="cm-empty">
                    <span className="ico">📥</span>
                    No pending join requests right now.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════
             MAIN DASHBOARD: Groups Grid and Teams Grid
          ════════════════════════════════════════════════════════ */
          <div>
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

                      return (
                        <div
                          key={g.group_id || g.id}
                          className="cm-card"
                          onClick={() => handleSelectGroup(g.group_id || g.id)}
                        >
                          <div className="cm-card-top">
                            <div className="cm-avatar">{initial}</div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                                <div className="cm-name">{g.name}</div>
                                {isOwner && (
                                  <button
                                    type="button"
                                    className="mini mini-ghost"
                                    style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditGroup(g);
                                    }}
                                  >
                                    ✏️ Edit
                                  </button>
                                )}
                              </div>
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
                            <span
                              style={{ cursor: 'pointer', color: 'var(--accent-yellow)' }}
                              title="View tournaments for this group"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectGroup(g.group_id || g.id, 'tournaments');
                              }}
                            >
                              🏆 {g.tournament_count || 0} event{(g.tournament_count || 0) === 1 ? '' : 's'}
                            </span>
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

                      return (
                        <div
                          key={g.group_id || g.id}
                          className="cm-card"
                          onClick={() => handleSelectGroup(g.group_id || g.id)}
                        >
                          <div className="cm-card-top">
                            <div className="cm-avatar">{initial}</div>
                            <div style={{ minWidth: 0, flex: 1 }}>
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
                            <span
                              style={{ cursor: 'pointer', color: 'var(--accent-yellow)' }}
                              title="View tournaments for this group"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectGroup(g.group_id || g.id, 'tournaments');
                              }}
                            >
                              🏆 {g.tournament_count || 0} event{(g.tournament_count || 0) === 1 ? '' : 's'}
                            </span>
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
                {/* Pending Team Invitations */}
                {pendingTeamInvites.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <div className="sec-label">
                      <div className="sec-label-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚔️</span> Pending Team Invitations
                        <span className="pill pill-cap" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                          {pendingTeamInvites.length}
                        </span>
                      </div>
                    </div>
                    <div className="cm-grid">
                      {pendingTeamInvites.map((inv) => (
                        <div key={inv.id} className="cm-card is-team" style={{ border: '1px solid rgba(0, 212, 255, 0.4)', background: 'rgba(0, 212, 255, 0.04)' }}>
                          <div className="cm-card-top">
                            <div className="cm-avatar team" style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)' }}>
                              {(inv.team_name || 'SQ').slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="cm-name">{inv.team_name}</div>
                              <div className="cm-sub">
                                <span>Invited by <strong>{inv.from}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.75rem 0' }}>
                            {inv.from} has invited you to join their squad roster!
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                              type="button"
                              className="mini mini-primary"
                              style={{ flex: 1, padding: '0.45rem 0.75rem' }}
                              onClick={() => handleAcceptTeamInvite(inv)}
                            >
                              ✓ Accept
                            </button>
                            <button
                              type="button"
                              className="mini"
                              style={{ flex: 1, padding: '0.45rem 0.75rem', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                              onClick={() => handleDeclineTeamInvite(inv)}
                            >
                              ✕ Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                          <div className="cm-actions" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="mini"
                              style={{ background: 'rgba(0, 212, 255, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 212, 255, 0.3)' }}
                              onClick={() => handleOpenTeamChat(t)}
                              title="Chat with team squad"
                            >
                              💬 Chat
                            </button>
                            <button
                              type="button"
                              className="mini mini-ghost"
                              onClick={() => handleOpenManageTeam(t)}
                              title="Manage squad roster and details"
                            >
                              ⚙️ Manage
                            </button>
                            {isCaptain && (
                              <>
                                <button
                                  type="button"
                                  className="mini"
                                  style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                                  onClick={() => handleOpenEditTeam(t)}
                                  title="Edit squad name"
                                >
                                  ✏️ Edit
                                </button>
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
                              </>
                            )}
                          </div>
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
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════ */}

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

      {/* EDIT GROUP MODAL */}
      {showEditGroup && (
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
          onClick={() => setShowEditGroup(false)}
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
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem' }}>Edit Group Details</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                onClick={() => setShowEditGroup(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitEditGroup}>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  id="edit-g-name"
                  placeholder="e.g. Dragon Clan"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  maxLength="100"
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Description</label>
                <textarea
                  className="form-control bg-dark text-white border-secondary"
                  id="edit-g-desc"
                  placeholder="What's this group about?"
                  rows="3"
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                ></textarea>
              </div>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Visibility</label>
                <select
                  className="form-select bg-dark text-white border-secondary"
                  id="edit-g-visibility"
                  value={editGroupVisibility}
                  onChange={(e) => setEditGroupVisibility(e.target.value)}
                >
                  <option value="public">🌐 Public — listed for anyone to find</option>
                  <option value="private">🔒 Private — hidden from browse</option>
                </select>
              </div>
              <div className="form-group mb-4">
                <label className="form-label text-white small fw-semibold">Who can join?</label>
                <select
                  className="form-select bg-dark text-white border-secondary"
                  id="edit-g-joinmode"
                  value={editGroupJoinMode}
                  onChange={(e) => setEditGroupJoinMode(e.target.value)}
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
                  disabled={submittingEditGroup}
                  onClick={() => setShowEditGroup(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-yellow btn-sm px-4"
                  disabled={submittingEditGroup}
                >
                  {submittingEditGroup ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TOURNAMENT MODAL (FOR COMMUNITY GROUP OWNER) */}
      {showEditTourn && (
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
          onClick={() => setShowEditTourn(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: '560px',
              width: '100%',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem' }}>Edit Tournament</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                onClick={() => setShowEditTourn(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitEditTourn}>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Tournament Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  value={editTournName}
                  onChange={(e) => setEditTournName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Description <span className="text-danger">*</span></label>
                <textarea
                  className="form-control bg-dark text-white border-secondary"
                  rows={3}
                  value={editTournDesc}
                  onChange={(e) => setEditTournDesc(e.target.value)}
                  required
                />
              </div>
              <div className="form-group mb-3">
                <div className="prize-header-row">
                  <label className="form-label text-white small fw-semibold mb-0">Prize Pool <span className="text-danger">*</span></label>
                  <button
                    type="button"
                    className="btn-rupee-toggle"
                    onClick={handleToggleRupee}
                  >
                    {editTournPrize.includes('₹') ? 'Remove ₹' : '+ Add ₹'}
                  </button>
                </div>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="e.g. ₹5,000 or ₹10,000"
                  value={editTournPrize}
                  onChange={(e) => setEditTournPrize(e.target.value)}
                  required
                />
                <div className="prize-hint">
                  Rupee symbol (₹) is the default currency. You can edit the amount or click 'Remove ₹' to customize.
                </div>
              </div>
              <div className="form-group mb-3">
                <label className="form-label text-white small fw-semibold">Max Participants <span className="text-danger">*</span></label>
                <input
                  type="number"
                  min="2"
                  max="256"
                  className="form-control bg-dark text-white border-secondary"
                  value={editTournMax}
                  onChange={(e) => setEditTournMax(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }} className="mb-4">
                <div>
                  <label className="form-label text-white small fw-semibold">Reg. Closes</label>
                  <input
                    type="date"
                    className="form-control bg-dark text-white border-secondary"
                    value={editTournRegClose}
                    onChange={(e) => setEditTournRegClose(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label text-white small fw-semibold">Start Date</label>
                  <input
                    type="date"
                    className="form-control bg-dark text-white border-secondary"
                    value={editTournStartDate}
                    onChange={(e) => setEditTournStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label text-white small fw-semibold">End Date</label>
                  <input
                    type="date"
                    className="form-control bg-dark text-white border-secondary"
                    value={editTournEndDate}
                    onChange={(e) => setEditTournEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm px-3"
                  disabled={submittingEditTourn}
                  onClick={() => setShowEditTourn(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-yellow btn-sm px-4"
                  disabled={submittingEditTourn}
                >
                  {submittingEditTourn ? 'Saving...' : 'Save Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE TOURNAMENT MODAL (FOR COMMUNITY GROUP OWNER) */}
      {showManageTourn && manageTourn && (
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
          onClick={() => setShowManageTourn(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: '740px',
              width: '100%',
              maxHeight: '88vh',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem' }}>
                  ⚙️ Manage: {manageTourn.tournament_name || manageTourn.name}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Status: {renderStatusBadge(manageTourn.status)} · Prize: {manageTourn.prize || 'None'} · Registered: {entrantCount(manageTourn, db)}/{manageTourn.maxParticipants || 16} {manageTourn.team_size ? 'Teams' : 'Players'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => handleOpenEditTourn(manageTourn)}
                  title="Edit tournament name, description, prize"
                >
                  ✏️ Edit Details
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-info"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => {
                    setShowManageTourn(false);
                    navigate(`/player/tournaments?highlight=${manageTourn.tournament_id || manageTourn.id}`);
                  }}
                  title="View public tournament details page"
                >
                  ↗ View Public Page
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5 ms-1"
                  onClick={() => setShowManageTourn(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {/* Controls */}
              {(() => {
                const mStatus = (manageTourn.status || 'upcoming').toLowerCase().replace('_', '-');
                const isUpcoming = mStatus === 'upcoming';
                const isInProgress = mStatus === 'in-progress' || mStatus === 'live';
                const isPaused = mStatus === 'paused';
                const isCancelled = mStatus === 'cancelled';
                const isCompleted = mStatus === 'completed';

                return (
                  <>
                    {isUpcoming && (
                      <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>Ready to Start Tournament?</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                              Starting generates the knockout tournament bracket and locks player registrations.
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="mini mini-primary"
                              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                              onClick={() => handleStartTournament(manageTourn.tournament_id || manageTourn.id)}
                            >
                              🚀 Start Tournament Now
                            </button>
                            <button
                              type="button"
                              className="mini"
                              style={{ padding: '0.55rem 0.9rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.08)' }}
                              onClick={() => handleExtendDeadlinePrompt(manageTourn.tournament_id || manageTourn.id)}
                            >
                              📅 Extend Deadline
                            </button>
                            <button
                              type="button"
                              className="mini"
                              style={{ padding: '0.55rem 0.9rem', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                              onClick={() => handleCancelTournament(manageTourn.tournament_id || manageTourn.id)}
                            >
                              🛑 Cancel
                            </button>
                          </div>
                        </div>

                        {/* Registered Entrants Chips */}
                        {(() => {
                          const tid = manageTourn.tournament_id || manageTourn.id;
                          const regList = (db?.player_tournament || [])
                            .filter((pt) => sameId(pt.tournament_id, tid))
                            .map((pt) => entrantName(manageTourn, pt.player_id, db));
                          const fromObj = (manageTourn.registeredPlayers || manageTourn.registered_player_ids || []).map((p) =>
                            entrantName(manageTourn, typeof p === 'object' ? p.id || p.user_id : p, db)
                          );
                          const allReg = [...new Set([...regList, ...fromObj])].filter(Boolean);

                          return (
                            <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                                👥 Registered Entrants ({allReg.length}/{manageTourn.maxParticipants || 16}):
                              </div>
                              {allReg.length > 0 ? (
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  {allReg.map((pName, pIdx) => (
                                    <span
                                      key={pIdx}
                                      style={{
                                        fontSize: '0.75rem',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px',
                                        background: 'rgba(0, 212, 255, 0.12)',
                                        border: '1px solid rgba(0, 212, 255, 0.25)',
                                        color: 'var(--accent-cyan)',
                                        fontWeight: 600
                                      }}
                                    >
                                      ✓ {pName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                  No players registered yet. Entrants will appear here as they sign up.
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {isInProgress && (
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                            🏆 Live Bracket: Round {manageTourn.currentRound || 1}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            Choose match winners below to progress through rounds.
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="mini mini-primary"
                            onClick={() => handleAdvanceRound(manageTourn.tournament_id || manageTourn.id)}
                          >
                            Advance Next Round →
                          </button>
                          <button
                            type="button"
                            className="mini"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                            onClick={() => handlePauseTournament(manageTourn.tournament_id || manageTourn.id)}
                          >
                            ⏸️ Pause
                          </button>
                          <button
                            type="button"
                            className="mini mini-primary"
                            onClick={() => handleDeclareWinnerDirect(manageTourn.tournament_id || manageTourn.id)}
                          >
                            👑 Announce Winner
                          </button>
                          <button
                            type="button"
                            className="mini"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                            onClick={() => handleCancelTournament(manageTourn.tournament_id || manageTourn.id)}
                          >
                            🛑 Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isPaused && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
                            ⏸️ Tournament Paused
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            Matches are temporarily on hold. You can resume at any time.
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="mini mini-primary"
                            onClick={() => handleResumeTournament(manageTourn.tournament_id || manageTourn.id)}
                          >
                            ▶️ Resume Tournament
                          </button>
                          <button
                            type="button"
                            className="mini"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                            onClick={() => handleExtendDeadlinePrompt(manageTourn.tournament_id || manageTourn.id)}
                          >
                            📅 Extend Deadline
                          </button>
                          <button
                            type="button"
                            className="mini mini-primary"
                            onClick={() => handleDeclareWinnerDirect(manageTourn.tournament_id || manageTourn.id)}
                          >
                            👑 Announce Winner
                          </button>
                          <button
                            type="button"
                            className="mini"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                            onClick={() => handleCancelTournament(manageTourn.tournament_id || manageTourn.id)}
                          >
                            🛑 Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isCancelled && (
                      <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem', textAlign: 'center', color: '#f87171', fontWeight: 700 }}>
                        🛑 Tournament Cancelled {manageTourn.cancel_reason ? `(${manageTourn.cancel_reason})` : ''}
                      </div>
                    )}

                    {isCompleted && (
                      <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem', textAlign: 'center', color: 'var(--accent-green)', fontWeight: 700 }}>
                        🎉 Tournament Complete! {manageTourn.winner ? `Winner: ${manageTourn.winner} 🏆` : 'All matches have concluded.'}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Matches List */}
              {(() => {
                let rawMgmtStages = (Array.isArray(manageTourn?.games) && manageTourn.games.length > 0)
                  ? manageTourn.games
                  : (Array.isArray(manageTourn?.stages) && manageTourn.stages.length > 0)
                    ? manageTourn.stages
                    : (Array.isArray(manageTourn?.stage_games) && manageTourn.stage_games.length > 0)
                      ? manageTourn.stage_games
                      : (db?.tournament_games || []).filter((tg) => sameId(tg.tournament_id, manageTourn?.tournament_id || manageTourn?.id));

                const isMultiName = (manageTourn?.tournament_name || manageTourn?.name || '').toLowerCase().includes('multi');
                if (rawMgmtStages.length < 2 && (manageTourn?.type === 'multi' || isMultiName)) {
                  const gList = db?.games || [];
                  const chessG = gList.find((g) => (g.game_name || g.name || '').toLowerCase().includes('chess')) || gList[0] || { game_id: 7, game_name: 'Chess Pro' };
                  const hextrisG = gList.find((g) => (g.game_name || g.name || '').toLowerCase().includes('hextris')) || gList[1] || { game_id: 8, game_name: 'Hextris' };
                  rawMgmtStages = [
                    { order: 1, stage_order: 1, stageId: chessG.game_id || 7, game_id: chessG.game_id || 7, game_name: chessG.game_name || chessG.name || 'Chess Pro', name: chessG.game_name || chessG.name || 'Chess Pro' },
                    { order: 2, stage_order: 2, stageId: hextrisG.game_id || 8, game_id: hextrisG.game_id || 8, game_name: hextrisG.game_name || hextrisG.name || 'Hextris', name: hextrisG.game_name || hextrisG.name || 'Hextris' }
                  ];
                }

                const isMgmtMulti = manageTourn?.type === 'multi' || isMultiName || rawMgmtStages.length > 1;
                const mgmtStageOptions = isMgmtMulti
                  ? rawMgmtStages.map((s, idx) => {
                    const order = s.stage_order || (idx + 1);
                    const gObj = (db?.games || []).find((g) => sameId(g.game_id || g.id, s.game_id || s.gameId));
                    const name = gObj?.game_name || gObj?.name || s.game_name || s.name || `Stage ${order}`;
                    return { order, name };
                  })
                  : [];

                const filteredMatches = manageStageFilter === 'all'
                  ? manageMatches
                  : manageMatches.filter((m) => Number(m.stage_order || 1) === Number(manageStageFilter));

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                        Matches & Bracket
                      </div>
                      {isMgmtMulti && mgmtStageOptions.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`mini ${manageStageFilter === 'all' ? 'mini-primary' : ''}`}
                            onClick={() => setManageStageFilter('all')}
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                          >
                            All Stages
                          </button>
                          {mgmtStageOptions.map((st) => (
                            <button
                              key={st.order}
                              type="button"
                              className={`mini ${Number(manageStageFilter) === Number(st.order) ? 'mini-primary' : ''}`}
                              onClick={() => setManageStageFilter(st.order)}
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                            >
                              Stage {st.order}: {st.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {filteredMatches.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {filteredMatches.map((m) => {
                          const p1 = m.player1_name || (db.users || []).find((u) => sameId(u.id || u.user_id, m.player1))?.user_name || (m.player1 === 'BYE' ? 'BYE' : m.player1) || 'TBD';
                          const p2 = m.player2_name || (db.users || []).find((u) => sameId(u.id || u.user_id, m.player2))?.user_name || (m.player2 === 'BYE' ? 'BYE' : m.player2) || 'TBD';
                          const effectiveWinnerId = m.winnerId || m.winner_id;
                          const hasWinner = (effectiveWinnerId != null && String(effectiveWinnerId).trim() !== '' && String(effectiveWinnerId) !== 'undefined' && String(effectiveWinnerId) !== 'null') || (m.winner != null && String(m.winner).trim() !== '');
                          const isDone = (m.status === 'completed' || m.status === 'finished') && hasWinner;
                          const isPlayable = (!isDone || !hasWinner) && m.player1 && m.player2 && m.player1 !== 'BYE' && m.player2 !== 'BYE';
                          const winnerName = m.winner_name || (sameId(effectiveWinnerId, m.player1) ? p1 : sameId(effectiveWinnerId, m.player2) ? p2 : (effectiveWinnerId ? entrantName(manageTourn, effectiveWinnerId, db) : (m.winner || manageTourn?.winner || '')));

                          return (
                            <div
                              key={m.match_id}
                              style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ minWidth: '180px' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                  {m.stage_name ? <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{m.stage_name} · </span> : ''}
                                  {m.match_id} · Round {m.round}
                                  {m.status === 'disputed' ? (
                                    <span className="pill pill-private ms-2" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>⚠️ DISPUTED</span>
                                  ) : m.status === 'pending' ? (
                                    <span className="pill pill-cap ms-2">PENDING</span>
                                  ) : isDone ? (
                                    <span className="pill pill-ready ms-2">COMPLETED</span>
                                  ) : m.status === 'completed' && !hasWinner ? (
                                    <span className="pill pill-private ms-2" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>⚠️ WINNER NEEDED</span>
                                  ) : (
                                    <span className="pill ms-2" style={{ background: 'rgba(255,255,255,0.06)' }}>READY</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem' }}>
                                  <span style={{ fontWeight: 700, color: hasWinner && sameId(m.winnerId, m.player1) ? 'var(--accent-green)' : '#fff' }}>
                                    {p1}
                                  </span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>vs</span>
                                  <span style={{ fontWeight: 700, color: hasWinner && sameId(m.winnerId, m.player2) ? 'var(--accent-green)' : '#fff' }}>
                                    {p2}
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {isDone && (
                                  <>
                                    <span style={{ color: 'var(--accent-green)', fontSize: '0.82rem', fontWeight: 700 }}>
                                      🏆 Winner: {winnerName}
                                    </span>
                                    <button
                                      type="button"
                                      className="mini"
                                      style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', background: 'rgba(255,255,255,0.06)' }}
                                      onClick={() => handleForceWinner(m.match_id, sameId(m.winnerId, m.player1) ? m.player2 : m.player1, sameId(m.winnerId, m.player1) ? p2 : p1)}
                                      title="Override or change winner"
                                    >
                                      ✏️ Override
                                    </button>
                                  </>
                                )}

                                {m.status === 'disputed' && (
                                  <button
                                    type="button"
                                    className="mini"
                                    style={{ background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem' }}
                                    onClick={() => handleResetDispute(m.match_id)}
                                    title="Clear dispute and let players play"
                                  >
                                    ⚔️ Clear Dispute
                                  </button>
                                )}

                                {isPlayable && (
                                  <>
                                    <button
                                      type="button"
                                      className="mini mini-primary"
                                      onClick={() => handleForceWinner(m.match_id, m.player1, p1)}
                                    >
                                      🏆 Win {p1}
                                    </button>
                                    <button
                                      type="button"
                                      className="mini mini-primary"
                                      onClick={() => handleForceWinner(m.match_id, m.player2, p2)}
                                    >
                                      🏆 Win {p2}
                                    </button>
                                  </>
                                )}
                                {!isDone && !isPlayable && (
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                    Awaiting previous match
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        {manageTourn.status === 'upcoming'
                          ? 'The tournament bracket has not been generated yet. Click "🚀 Start Tournament Now" once players are registered.'
                          : 'No bracket matches found for this stage.'}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="modal-footer d-flex justify-content-between align-items-center pt-3 border-top border-secondary mt-3">
              <button
                type="button"
                className="btn btn-outline-light btn-sm px-3"
                onClick={() => setShowManageTourn(false)}
              >
                Close
              </button>
              {(manageTourn.status === 'in-progress' || manageTourn.status === 'live') && (
                <button
                  type="button"
                  className="btn btn-yellow btn-sm px-4"
                  onClick={() => handleAdvanceRound(manageTourn.tournament_id || manageTourn.id)}
                >
                  Advance Next Round →
                </button>
              )}
            </div>
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
              <p className="text-muted small mb-4">
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
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem' }}>Invite Teammate</h3>
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
                <label className="form-label text-white small fw-semibold">Select Friend <span className="text-danger">*</span></label>
                {eligiblePlayers.length > 0 ? (
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    id="am-player"
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    required
                  >
                    {eligiblePlayers.map((u) => (
                      <option key={u.user_id || u.id} value={u.user_id || u.id}>
                        {u.user_name || u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-muted small">No friends available to invite. Only confirmed friends who are not already in this squad can be invited.</div>
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
                  {submittingMember ? 'Sending Invite...' : 'Send Invite'}
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
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem' }}>Delete Team</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                onClick={() => setConfirmDeleteModal({ isOpen: false, teamId: null })}
              >
                ✕
              </button>
            </div>
            <div className="mb-4 text-white-50 small">
              Are you sure you want to delete this team? This action cannot be undone.
            </div>
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
                className="btn btn-danger btn-sm px-4"
                onClick={handleConfirmDeleteTeam}
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE TEAM MODAL */}
      {teamToManage && (() => {
        const isCap = Number(teamToManage.captain_id) === uid;
        const members = teamToManage.members || [];
        const capMember = members.find((m) => Number(m.user_id) === Number(teamToManage.captain_id));
        const capName = capMember?.user_name || '?';
        const initial = (teamToManage.name || '?').slice(0, 2).toUpperCase();

        return (
          <div
            className="modal-overlay show"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setTeamToManage(null)}
          >
            <div
              className="modal"
              style={{
                maxWidth: '560px',
                width: '100%',
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '1.75rem',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="cm-avatar team" style={{ width: 44, height: 44, fontSize: '1.1rem' }}>{initial}</div>
                  <div>
                    <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.25rem', fontFamily: "'Orbitron', monospace" }}>
                      {teamToManage.name}
                    </h3>
                    <div className="d-flex gap-2 align-items-center mt-1">
                      {isCap ? (
                        <span className="pill pill-cap" style={{ fontSize: '0.72rem' }}>⭐ You captain</span>
                      ) : (
                        <span className="text-white-50" style={{ fontSize: '0.75rem' }}>Captain: {capName}</span>
                      )}
                      <span className="pill pill-ready" style={{ fontSize: '0.72rem' }}>
                        {members.length} members
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                  onClick={() => setTeamToManage(null)}
                >
                  ✕
                </button>
              </div>

              {/* Quick Actions Row */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="mini mini-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => {
                    const current = teamToManage;
                    setTeamToManage(null);
                    handleOpenTeamChat(current);
                  }}
                >
                  💬 Team Chat
                </button>
                {isCap && (
                  <>
                    <button
                      type="button"
                      className="mini"
                      style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => {
                        handleOpenEditTeam(teamToManage);
                      }}
                    >
                      ✏️ Edit Name
                    </button>
                    <button
                      type="button"
                      className="mini mini-ghost"
                      onClick={() => {
                        handleOpenAddMember(teamToManage.team_id || teamToManage.id);
                      }}
                    >
                      + Invite Friend
                    </button>
                  </>
                )}
              </div>

              {/* Squad Roster */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Squad Roster ({members.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {members.map((m) => {
                    const links = linkedMap[m.user_id] || [];
                    const isMemberCaptain = Number(m.user_id) === Number(teamToManage.captain_id);
                    const isCurrentUser = Number(m.user_id) === uid;

                    return (
                      <div
                        key={m.user_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{m.avatar || '🎮'}</span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {m.user_name}
                              {isMemberCaptain && (
                                <span className="pill pill-cap" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Captain</span>
                              )}
                              {isCurrentUser && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', background: 'rgba(0,212,255,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>You</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {links.length > 0 ? (
                                <span style={{ color: 'var(--accent-green)' }}>
                                  🔗 {links.map((l) => `${l.platform_label || 'Game'}: ${l.in_game_name || 'Linked'}`).join(', ')}
                                </span>
                              ) : (
                                <span>No linked game account</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          {isCap && !isMemberCaptain && (
                            <button
                              type="button"
                              className="mini mini-danger"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                              onClick={async () => {
                                if (!window.confirm(`Remove ${m.user_name} from the squad?`)) return;
                                await handleRemoveMember(teamToManage.team_id || teamToManage.id, m.user_id);
                                setTeamToManage((prev) => prev ? {
                                  ...prev,
                                  members: (prev.members || []).filter((x) => x.user_id !== m.user_id)
                                } : prev);
                              }}
                            >
                              Remove
                            </button>
                          )}
                          {!isCap && isCurrentUser && (
                            <button
                              type="button"
                              className="mini mini-danger"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                              onClick={() => handleLeaveTeam(teamToManage.team_id || teamToManage.id)}
                            >
                              Leave Team
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer / Danger zone */}
              <div className="modal-footer d-flex justify-content-between align-items-center pt-3 border-top border-secondary">
                {isCap ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      const targetId = teamToManage.team_id || teamToManage.id;
                      setTeamToManage(null);
                      setConfirmDeleteModal({ isOpen: true, teamId: targetId });
                    }}
                  >
                    🗑️ Delete Team
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleLeaveTeam(teamToManage.team_id || teamToManage.id)}
                  >
                    🚪 Leave Team
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm px-3"
                  onClick={() => setTeamToManage(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT TEAM MODAL */}
      {showEditTeam && (
        <div
          className="modal-overlay show"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowEditTeam(false)}
        >
          <div
            className="modal"
            style={{
              maxWidth: '440px',
              width: '100%',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-white fw-bold mb-0" style={{ fontSize: '1.2rem', fontFamily: "'Orbitron', monospace" }}>
                ✏️ Edit Squad Name
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                onClick={() => setShowEditTeam(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTeam}>
              <div className="mb-3">
                <label className="form-label text-white-50 small mb-1">Squad / Team Name</label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  placeholder="e.g. Shadow Strikers"
                  maxLength={40}
                  required
                  autoFocus
                />
              </div>

              <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm px-3"
                  onClick={() => setShowEditTeam(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm px-4"
                  disabled={submittingEditTeam || !editTeamName.trim()}
                >
                  {submittingEditTeam ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM CHAT MODAL */}
      {activeTeamChat && (() => {
        const tName = activeTeamChat.name || 'Team';
        const members = activeTeamChat.members || [];
        const initial = tName.slice(0, 2).toUpperCase();

        return (
          <div
            className="modal-overlay show"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(8px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setActiveTeamChat(null)}
          >
            <div
              className="modal"
              style={{
                maxWidth: '580px',
                width: '100%',
                background: '#111827',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                height: '620px',
                maxHeight: '90vh',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 212, 255, 0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="cm-avatar team" style={{ width: 38, height: 38, fontSize: '0.95rem' }}>{initial}</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', fontFamily: "'Orbitron', monospace", display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      💬 {tName} <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>Squad Chat</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {members.length} members · Coordination room
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="mini mini-ghost"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => fetchTeamChat(activeTeamChat.team_id || activeTeamChat.id)}
                    title="Refresh chat messages"
                  >
                    🔄
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-muted p-0 text-decoration-none fs-5"
                    onClick={() => setActiveTeamChat(null)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Chat Message History */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1rem 0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                {loadingTeamChat && teamChatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', fontSize: '0.85rem' }}>
                    Loading messages...
                  </div>
                ) : teamChatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>No messages yet</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Coordinate strategies, scrims, and tournament setups with your squad!
                    </div>
                  </div>
                ) : (
                  teamChatMessages.map((msg) => {
                    const isMe = Number(msg.from_user) === uid;
                    const senderMember = members.find((m) => Number(m.user_id) === Number(msg.from_user));
                    const displayName = msg.from_name || senderMember?.user_name || (isMe ? 'You' : `Player ${msg.from_user}`);
                    const isCap = Number(activeTeamChat.captain_id) === Number(msg.from_user);
                    const timeStr = msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', padding: '0 0.3rem' }}>
                          <span style={{ fontWeight: 600, color: isMe ? 'var(--accent-cyan)' : '#e2e8f0' }}>{isMe ? 'You' : displayName}</span>
                          {isCap && <span style={{ color: '#fbbf24', fontSize: '0.65rem' }}>⭐ Cap</span>}
                          {timeStr && <span>· {timeStr}</span>}
                        </div>
                        <div
                          style={{
                            maxWidth: '82%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            background: isMe ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.25), rgba(59, 130, 246, 0.3))' : 'rgba(255, 255, 255, 0.07)',
                            border: isMe ? '1px solid rgba(0, 212, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            fontSize: '0.88rem',
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input Footer */}
              <form
                onSubmit={handleSendTeamChat}
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  style={{ fontSize: '0.88rem' }}
                  placeholder={`Message ${tName}...`}
                  value={teamChatInput}
                  onChange={(e) => setTeamChatInput(e.target.value)}
                  maxLength={500}
                  disabled={sendingTeamChat}
                />
                <button
                  type="submit"
                  className="btn btn-primary px-3"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                  disabled={sendingTeamChat || !teamChatInput.trim()}
                >
                  {sendingTeamChat ? '...' : 'Send 📨'}
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* TOAST FEEDBACK */}
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
