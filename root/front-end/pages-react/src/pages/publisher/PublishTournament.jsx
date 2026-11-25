import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { usePublisherAuth } from '../../hooks/usePublisherAuth';
import {
  fetchTournaments,
  fetchTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  fetchTournamentStages,
  setPublisherView,
  setPublisherWizardStep,
  setPublisherSelectedType as setReduxPublisherType,
  setPublisherSelectedVisibility as setReduxPublisherVisibility,
  setPublisherStages as setReduxPublisherStages,
  setPublisherFormField,
  resetPublisherForm,
  setPublisherToast,
  clearPublisherToast,
  setPublisherStatusFilter,
  setPublisherSelectedGame,
  setPublisherEditId,
  setPublisherActiveTournament,
  openPublisherConfirmModal,
  closePublisherConfirmModal
} from '../../features/tournaments/tournamentSlice';
import {
  selectAllTournaments,
  selectTournamentById,
  selectTournamentMatches
} from '../../features/tournaments/selectors';
import {
  fetchTournamentBracket,
  startTournament as startTournamentBracket,
  fetchOverallLeaderboard,
  startTournamentStage,
  completeTournamentStage,
  resolveMatchDispute
} from '../../features/tournaments/tournamentPlaySlice';
import { fetchGames } from '../../features/games/gameSlice';
import { selectAllGames } from '../../features/games/selectors';
import { fetchUsers } from '../../features/users/userSlice';
import { selectAllUsers } from '../../features/users/selectors';
import TournamentCard from '../../components/publisher/tournament/TournamentCard';
import TournamentEditor from '../../components/publisher/tournament/TournamentEditor';
import TournamentMgmt from '../../components/publisher/tournament/TournamentMgmt';
import TournamentMultiMgmt from '../../components/publisher/tournament/TournamentMultiMgmt';
import ConfirmModal from '../../components/publisher/tournament/ConfirmModal';
import Toast from '../../components/common/Toast';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/publisher/tournament.css';

export function PublishTournament() {
  const dispatch = useAppDispatch();
  const {
    user,
    publisherId,
    isPublisher,
    authLoading
  } = usePublisherAuth();

  const uid = user?.userId ?? user?.id ?? publisherId ?? 1;

  const publisherUI = useAppSelector((state) => state.tournaments?.ui || {});
  const publisherForm = publisherUI.publisherForm || {};
  const view = publisherUI.publisherView || 'list';
  const setView = (value) => dispatch(setPublisherView(value));
  const editId = publisherUI.publisherEditId ?? null;
  const setEditId = (value) => dispatch(setPublisherEditId(value));
  const currentStep = publisherUI.publisherCurrentStep || 1;
  const setCurrentStep = (value) => dispatch(setPublisherWizardStep(value));
  const selectedType = publisherUI.publisherSelectedType || 'single';
  const setSelectedType = (value) => dispatch(setReduxPublisherType(value));
  const selectedVisibility = publisherUI.publisherSelectedVisibility || 'public';
  const setSelectedVisibility = (value) => dispatch(setReduxPublisherVisibility(value));
  const selectedGameId = publisherUI.publisherSelectedGameId || '';
  const setSelectedGameId = (value) => dispatch(setPublisherSelectedGame(value));
  const stages = publisherUI.publisherStages || [];
  const setStages = (value) => dispatch(setReduxPublisherStages(value));
  const { name = '', description = '', prize = '₹', maxPlayers = '32', regDeadline = '', startDate = '', endDate = '' } = publisherForm;
  const setFormField = (field, value) => dispatch(setPublisherFormField({ field, value }));
  const setName = (value) => setFormField('name', value);
  const setDescription = (value) => setFormField('description', value);
  const setPrize = (value) => setFormField('prize', value);
  const setMaxPlayers = (value) => setFormField('maxPlayers', value);
  const setRegDeadline = (value) => setFormField('regDeadline', value);
  const setStartDate = (value) => setFormField('startDate', value);
  const setEndDate = (value) => setFormField('endDate', value);
  const toast = publisherUI.publisherToast || { message: '', type: 'info' };
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redux store selectors
  const allTournaments = useAppSelector(selectAllTournaments);
  const allGames = useAppSelector(selectAllGames);
  const users = useAppSelector(selectAllUsers);

  // Publisher-specific views over shared state
  const tournaments = allTournaments.filter(
    (t) => String(t.organizer || t.publisher_id) === String(uid) && t.type !== 'multi'
  );
  const fests = allTournaments.filter(
    (t) => t.type === 'multi' && String(t.organizer || t.publisher_id) === String(uid)
  );
  const approvedGames = allGames.filter(
    (g) =>
      String(g.game_publisher || g.publisherId) === String(uid) &&
      (g.game_approval_status === 'approved' || g.status === 'approved') &&
      (g.game_status || 'enabled') === 'enabled'
  );

  // Toast & Modal
  const confirmModal = publisherUI.publisherConfirmModal || { isOpen: false };
  const confirmActionRef = useRef(null);

  // Editor form state
  const [gameError, setGameError] = useState('');
  const [stageError, setStageError] = useState('');
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [prizeError, setPrizeError] = useState('');
  const [maxPlayersError, setMaxPlayersError] = useState('');
  const [regDeadlineError, setRegDeadlineError] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [dateOrderError, setDateOrderError] = useState('');

  // Single-game management state
  const [activeTournament, setActiveTournament] = useState(null);
  const [activeMatches, setActiveMatches] = useState([]);

  // Multi-game fest management state
  const [activeFest, setActiveFest] = useState(null);
  const [activeFestStages, setActiveFestStages] = useState([]);
  const [activeFestOverall, setActiveFestOverall] = useState(null);

  // Load initial publisher tournament data via Redux
  const loadData = async () => {
    if (!isPublisher) return;
    setLoading(true);
    try {
      await Promise.allSettled([
        dispatch(fetchTournaments({ includePrivate: true })),
        dispatch(fetchGames()),
        dispatch(fetchUsers())
      ]);
    } catch (err) {
      console.warn('Failed to load publisher tournament data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isPublisher) {
      loadData();
    }
  }, [authLoading, isPublisher]);

  function showToast(message, type = 'info') {
    dispatch(setPublisherToast({ message, type }));
  }

  function openConfirm(title, message, onConfirm, confirmText = 'Confirm', confirmStyle = 'primary') {
    confirmActionRef.current = onConfirm;
    dispatch(openPublisherConfirmModal({ title, message, confirmText, variant: confirmStyle }));
  }

  function handleConfirmAction() {
    const action = confirmActionRef.current;
    confirmActionRef.current = null;
    dispatch(closePublisherConfirmModal());
    action?.();
  }

  function handleCancelConfirm() {
    confirmActionRef.current = null;
    dispatch(closePublisherConfirmModal());
  }

  // ── Open Editor ──────────────────────────────────────────────────────────
  function handleOpenEditor(id = null) {
    setEditId(id);
    setSelectedType('single');
    setSelectedVisibility('public');
    setStages([]);
    setCurrentStep(1);
    setGameError('');
    setStageError('');
    setNameError('');
    setDescriptionError('');
    setPrizeError('');
    setMaxPlayersError('');
    setRegDeadlineError('');
    setStartDateError('');
    setEndDateError('');
    setDateOrderError('');

    if (!id) {
      const defaultGameId = approvedGames.length > 0 ? String(approvedGames[0].id || approvedGames[0].game_id) : '';
      setSelectedGameId(defaultGameId);
      dispatch(resetPublisherForm());
    } else {
      const t = allTournaments.find((x) => String(x.tournament_id || x.id) === String(id));
      if (t) {
        setSelectedGameId(String(t.game_id));
        dispatch(resetPublisherForm({
          name: t.tournament_name || t.name || '',
          description: t.desc || '',
          prize: t.prize || '₹',
          maxPlayers: String(t.maxParticipants || 32),
          regDeadline: t.regClose || '',
          startDate: t.start_date || t.startDate || '',
          endDate: t.end_date || ''
        }));
      }
    }

    setView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Stage builder actions
  function handleAddStage() {
    if (!approvedGames.length) {
      showToast('You need at least one approved game to build stages.', 'error');
      return;
    }
    const defaultGameId = String(approvedGames[0].id || approvedGames[0].game_id);
    const nextStages = [
      ...stages,
      {
        rowId: Date.now() + Math.random(),
        game_id: defaultGameId,
        format: 'score',
        metric: 'score',
        direction: 'high',
        metric_label: 'Score',
        points_weight: 1
      }
    ];
    dispatch(setReduxPublisherStages(nextStages));
    setStages(nextStages);
  }

  function handleUpdateStage(rowId, field, value) {
    const nextStages = stages.map((s) => {
        if (s.rowId !== rowId) return s;
        return {
          ...s,
          [field]: field === 'points_weight' ? parseFloat(value) || 1 : value
        };
      });
    dispatch(setReduxPublisherStages(nextStages));
    setStages(nextStages);
  }

  function handleRemoveStage(rowId) {
    const nextStages = stages.filter((s) => s.rowId !== rowId);
    dispatch(setReduxPublisherStages(nextStages));
    setStages(nextStages);
  }

  // Step validation
  function handleNextStep(step) {
    if (step === 1) {
      if (selectedType === 'multi' && stages.length === 0) {
        handleAddStage();
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 2) {
      if (selectedType === 'single') {
        if (!selectedGameId) {
          setGameError('Please select a game to continue');
          return;
        }
        setGameError('');
      } else if (selectedType === 'multi') {
        if (stages.length < 2) {
          setStageError('A multi-game fest needs at least 2 stages');
          return;
        }
        setStageError('');
      }
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 3) {
      let valid = true;
      if (!name.trim()) {
        setNameError('Tournament name is required');
        valid = false;
      } else {
        setNameError('');
      }

      if (!description.trim()) {
        setDescriptionError('Description is required');
        valid = false;
      } else {
        setDescriptionError('');
      }

      const pTrim = prize.trim();
      if (!pTrim || pTrim === '₹') {
        setPrizeError('Prize pool is required');
        valid = false;
      } else {
        setPrizeError('');
      }

      const mp = parseInt(maxPlayers, 10);
      if (isNaN(mp) || mp < 2) {
        setMaxPlayersError('Min 2 players required');
        valid = false;
      } else {
        setMaxPlayersError('');
      }

      if (!valid) return;
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  function handlePrevStep(step) {
    const nextStep = Math.max(1, (step || currentStep) - 1);
    setCurrentStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Submit tournament
  async function handleSubmitTournament() {
    if (selectedType === 'single' && !selectedGameId) {
      showToast('You must select a game in Step 2', 'error');
      return;
    }
    if (selectedType === 'multi' && stages.length < 2) {
      showToast('Add at least 2 stages in Step 2', 'error');
      return;
    }

    const vName = name.trim();
    const vDesc = description.trim();
    const vPrize = prize.trim();
    if (!vName || !vDesc || !vPrize || vPrize === '₹') {
      showToast('All details in Step 3 are required', 'error');
      return;
    }

    if (!regDeadline || !startDate || !endDate) {
      showToast('All dates are required', 'error');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setDateOrderError('Start date cannot be after the end date.');
      showToast('Start date cannot be after the end date.', 'error');
      return;
    }
    if (new Date(regDeadline) > new Date(startDate)) {
      setDateOrderError('Registration deadline must be before or on the start date.');
      showToast('Registration deadline must be before or on the start date.', 'error');
      return;
    }
    setDateOrderError('');

    const uidNum = parseInt(user?.userId || user?.id || 1, 10);
    setIsSubmitting(true);

    // Multi-game fests (backend API via Redux)
    if (selectedType === 'multi' && !editId) {
      const payload = {
        organizer: uidNum,
        organizer_role: 'publisher',
        type: 'multi',
        visibility: selectedVisibility,
        tournament_name: vName,
        desc: vDesc,
        prize: vPrize,
        maxParticipants: parseInt(maxPlayers, 10) || 32,
        start_date: startDate,
        end_date: endDate,
        regClose: regDeadline,
        games: stages.map((s, i) => ({
          game_id: parseInt(s.game_id, 10),
          stage_order: i + 1,
          format: s.format,
          metric: s.format === 'score' ? s.metric || 'score' : undefined,
          direction: s.format === 'score' ? s.direction || 'high' : undefined,
          metric_label: s.format === 'score' ? s.metric_label || 'Score' : undefined,
          points_weight: s.points_weight || 1
        }))
      };

      try {
        const created = await dispatch(createTournament(payload)).unwrap();
        showToast(`Multi-game fest published! 🏅 (ID: #${created?.tournament_id || created?.id || 'saved'})`, 'success');
        if (selectedVisibility === 'private' && created?.invite_code) {
          openConfirm(
            'Invite Code',
            `Share this code with the players you want to invite:\n\n${created.invite_code}`,
            () => {},
            'Close',
            'primary'
          );
        }
        await loadData();
        setView('list');
      } catch (e) {
        showToast(e || 'Could not publish tournament — is backend running?', 'error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Single-game (backend API via Redux)
    try {
      let created = null;
      if (editId) {
        const payload = {
          tournament_name: vName,
          desc: vDesc,
          prize: vPrize,
          maxParticipants: parseInt(maxPlayers, 10) || 32,
          start_date: startDate,
          end_date: endDate,
          regClose: regDeadline,
          visibility: selectedVisibility || 'public'
        };
        created = await dispatch(updateTournament({ id: editId, data: payload })).unwrap();
        showToast('Tournament updated! ✅', 'success');
      } else {
        const payload = {
          organizer: uidNum,
          organizer_role: 'publisher',
          type: 'single',
          format: 'bracket',
          game_id: parseInt(selectedGameId, 10),
          tournament_name: vName,
          desc: vDesc,
          prize: vPrize,
          maxParticipants: parseInt(maxPlayers, 10) || 32,
          start_date: startDate,
          end_date: endDate,
          regClose: regDeadline,
          visibility: selectedVisibility || 'public'
        };
        created = await dispatch(createTournament(payload)).unwrap();
        showToast(`Tournament published! 🏆 (ID: #${created?.tournament_id || created?.id || 'saved'})`, 'success');
      }

      await loadData();
      setView('list');
    } catch (err) {
      showToast(err || 'Failed to save tournament', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Delete tournament
  function handleDeleteTournament(id) {
    openConfirm(
      'Delete Tournament',
      'Permanently delete this tournament and all its matches? This cannot be undone.',
      async () => {
        try {
          await dispatch(deleteTournament(id)).unwrap();
          showToast('Tournament successfully deleted', 'success');
          await loadData();
        } catch (e) {
          showToast(e || 'Failed to delete tournament', 'error');
        }
      },
      'Delete',
      'danger'
    );
  }

  // Single-game Management view
  async function handleOpenMgmt(id) {
    dispatch(setPublisherActiveTournament(id));
    let t = allTournaments.find((x) => String(x.tournament_id || x.id) === String(id));
    try {
      const fetched = await dispatch(fetchTournamentById(id)).unwrap();
      if (fetched) t = fetched;
    } catch (e) {
      // Use existing t from allTournaments
    }
    if (!t) {
      showToast('Could not find tournament details.', 'error');
      return;
    }

    setActiveTournament(t);

    // Fetch bracket matches via Redux
    try {
      const bracketAction = await dispatch(fetchTournamentBracket(id)).unwrap();
      const bMatches = Array.isArray(bracketAction?.bracket?.matches)
        ? bracketAction.bracket.matches
        : Array.isArray(bracketAction?.matches)
        ? bracketAction.matches
        : Array.isArray(bracketAction)
        ? bracketAction
        : [];
      setActiveMatches(bMatches);
    } catch (e) {
      setActiveMatches([]);
    }

    setView('mgmt');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleStartTournament() {
    if (!activeTournament) return;
    const tid = activeTournament.tournament_id || activeTournament.id;
    const uidNum = parseInt(user?.userId || user?.id || 1, 10);

    openConfirm(
      'Start Tournament',
      'This will generate the bracket and close registration. Continue?',
      async () => {
        try {
          await dispatch(startTournamentBracket({ id: tid, organizerId: uidNum })).unwrap();
          await dispatch(fetchTournamentById(tid)).unwrap();
          showToast('Tournament Started! Bracket generated.', 'success');
          await handleOpenMgmt(tid);
          await loadData();
        } catch (e) {
          showToast(e || 'Failed to start tournament', 'error');
        }
      },
      'Start Now',
      'warning'
    );
  }

  function handleAdvanceRound() {
    // Unsupported server operation: backend has no manual round advance endpoint.
    // Rounds advance automatically upon match completion.
    showToast('Rounds advance automatically upon match completion (API gap: no manual advance endpoint)', 'info');
  }

  function handleForceWinner(matchId, winnerId, p1Name) {
    openConfirm(
      'Manual Override',
      `Declare ${p1Name || winnerId} the winner of this match?`,
      async () => {
        if (!activeTournament) return;
        const tid = activeTournament.tournament_id || activeTournament.id;
        const uidNum = parseInt(user?.userId || user?.id || 1, 10);
        const m = activeMatches.find((x) => x.match_id === matchId);
        if (!m) return;

        try {
          await dispatch(
            resolveMatchDispute({
              matchId,
              organizer_id: uidNum,
              winner_id: parseInt(winnerId, 10) || winnerId,
              tournamentId: tid
            })
          ).unwrap();
          showToast('Match result recorded!', 'success');
          await handleOpenMgmt(tid);
          await loadData();
        } catch (e) {
          showToast(typeof e === 'string' ? e : 'Failed to record match result', 'error');
        }
      },
      'Confirm Winner',
      'primary'
    );
  }

  async function handlePauseTournament() {
    if (!activeTournament) return;
    const tid = activeTournament.tournament_id || activeTournament.id;
    try {
      await dispatch(updateTournament({ id: tid, data: { status: 'paused' } })).unwrap();
      showToast('Tournament paused ⏸️', 'info');
      await handleOpenMgmt(tid);
      await loadData();
    } catch (e) {
      showToast(e || 'Failed to pause tournament', 'error');
    }
  }

  async function handleResumeTournament() {
    if (!activeTournament) return;
    const tid = activeTournament.tournament_id || activeTournament.id;
    try {
      await dispatch(updateTournament({ id: tid, data: { status: 'in-progress' } })).unwrap();
      showToast('Tournament resumed! ▶️', 'success');
      await handleOpenMgmt(tid);
      await loadData();
    } catch (e) {
      showToast(e || 'Failed to resume tournament', 'error');
    }
  }

  async function handleCancelTournament(reason) {
    if (!activeTournament) return;
    const tid = activeTournament.tournament_id || activeTournament.id;
    try {
      await dispatch(updateTournament({ id: tid, data: { status: 'cancelled' } })).unwrap();
      showToast('Tournament cancelled 🛑', 'info');
      await handleOpenMgmt(tid);
      await loadData();
    } catch (e) {
      showToast(e || 'Failed to cancel tournament', 'error');
    }
  }

  async function handleDeclareWinner(winnerId, winnerName) {
    if (!activeTournament) return;
    const tid = activeTournament.tournament_id || activeTournament.id;
    const wName = winnerName || users.find((u) => String(u.id || u.user_id) === String(winnerId))?.user_name || String(winnerId);
    try {
      await dispatch(
        updateTournament({
          id: tid,
          data: {
            status: 'completed',
            winner_id: parseInt(winnerId, 10) || undefined,
            winner: wName
          }
        })
      ).unwrap();
      showToast(`Winner declared: ${wName}! 🏆 Tournament completed.`, 'success');
      await handleOpenMgmt(tid);
      await loadData();
    } catch (e) {
      showToast(e || 'Failed to declare winner', 'error');
    }
  }

  async function handleExtendDeadline(newDeadline) {
    if (!activeTournament) return;
    const tid = activeTournament.tournament_id || activeTournament.id;
    const payload = { regClose: newDeadline };
    if (activeTournament.start_date && new Date(newDeadline) > new Date(activeTournament.start_date)) {
      payload.start_date = newDeadline;
    }
    try {
      await dispatch(updateTournament({ id: tid, data: payload })).unwrap();
      showToast('Registration deadline extended! 📅', 'success');
      await handleOpenMgmt(tid);
      await loadData();
    } catch (e) {
      showToast(e || 'Failed to extend deadline', 'error');
    }
  }

  async function handleOpenMgmtMulti(id) {
    dispatch(setPublisherActiveTournament(id));
    try {
      const [tRes, stagesRes, overallRes] = await Promise.all([
        dispatch(fetchTournamentById(id)).unwrap(),
        dispatch(fetchTournamentStages(id)).unwrap(),
        dispatch(fetchOverallLeaderboard(id)).unwrap()
      ]);
      setActiveFest(tRes);
      setActiveFestStages(stagesRes?.stages || []);
      setActiveFestOverall(overallRes?.overallLeaderboard || overallRes);
      setView('mgmt-multi');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      showToast(e || 'Could not load this fest from backend.', 'error');
    }
  }

  async function handleStartFestStage(stageId) {
    if (!activeFest) return;
    const uidNum = parseInt(user?.userId || user?.id || 1, 10);
    const tid = activeFest.tournament_id || activeFest.id;
    try {
      await dispatch(startTournamentStage({ id: tid, stageId, organizerId: uidNum })).unwrap();
      showToast('Stage started!', 'success');
      handleOpenMgmtMulti(tid);
    } catch (e) {
      showToast(e || 'Could not start stage.', 'error');
    }
  }

  function handleCompleteFestStage(stageId) {
    if (!activeFest) return;
    const uidNum = parseInt(user?.userId || user?.id || 1, 10);
    const tid = activeFest.tournament_id || activeFest.id;

    openConfirm(
      'Close Stage',
      'Close this stage and lock in its standings?',
      async () => {
        try {
          await dispatch(completeTournamentStage({ id: tid, stageId, organizerId: uidNum })).unwrap();
          showToast('Stage closed!', 'success');
          handleOpenMgmtMulti(tid);
        } catch (e) {
          showToast(e || 'Could not close stage.', 'error');
        }
      },
      'Close Stage',
      'primary'
    );
  }

  if (authLoading) {
    return <LoadingState message="Loading Publisher Studio…" />;
  }

  if (!authLoading && !isPublisher) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h2>Publisher Access Required</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Please sign in with a publisher account to access this studio page.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1.5rem' }}
          onClick={() => {
            window.location.href = '/index.html';
          }}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* ══ LIST VIEW ════════════════════════════════════════ */}
      {view === 'list' && (
        <div id="list-view">
          <div className="page-header-row mb-3">
            <div>
              <h1>Tournament Hub</h1>
              <p className="text-muted">Manage your competitive series, leagues and events</p>
            </div>
            <button
              className="btn btn-yellow btn-lg"
              onClick={() => handleOpenEditor()}
            >
              🏆 Publish New Tournament
            </button>
          </div>

          <div id="tournaments-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {tournaments.map((t) => {
              const g = allGames.find(
                (gx) => String(gx.game_id || gx.id) === String(t.game_id)
              );
              return (
                <TournamentCard
                  key={t.tournament_id || t.id}
                  tournament={t}
                  gameName={g ? g.game_name || g.title : 'Unknown'}
                  isMulti={false}
                  onManage={handleOpenMgmt}
                  onEdit={handleOpenEditor}
                  onDelete={handleDeleteTournament}
                />
              );
            })}

            {fests.map((f) => (
              <TournamentCard
                key={f.tournament_id || f.id}
                tournament={f}
                isMulti={true}
                onManage={handleOpenMgmtMulti}
              />
            ))}

            {tournaments.length === 0 && fests.length === 0 && !loading && (
              <div className="empty-state">
                <div className="icon">🏆</div>
                <h3>No tournaments yet</h3>
                <p>Organize your first competitive series now</p>
                <button
                  className="btn btn-yellow mt-2"
                  onClick={() => handleOpenEditor()}
                >
                  Publish Tournament
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ EDITOR VIEW ════════════════════════════════════════ */}
      {view === 'editor' && (
        <TournamentEditor
          editId={editId}
          currentStep={currentStep}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          selectedVisibility={selectedVisibility}
          onSelectVisibility={setSelectedVisibility}
          approvedGames={approvedGames}
          selectedGameId={selectedGameId}
          onSelectGame={(gid) => {
            setSelectedGameId(gid);
            setGameError('');
          }}
          gameError={gameError}
          stages={stages}
          onAddStage={handleAddStage}
          onUpdateStage={handleUpdateStage}
          onRemoveStage={handleRemoveStage}
          stageError={stageError}
          name={name}
          onChangeName={(val) => {
            setName(val);
            if (nameError) setNameError('');
          }}
          nameError={nameError}
          description={description}
          onChangeDescription={(val) => {
            setDescription(val);
            if (descriptionError) setDescriptionError('');
          }}
          descriptionError={descriptionError}
          prize={prize}
          onChangePrize={(val) => {
            setPrize(val);
            if (prizeError) setPrizeError('');
          }}
          prizeError={prizeError}
          maxPlayers={maxPlayers}
          onChangeMaxPlayers={(val) => {
            setMaxPlayers(val);
            if (maxPlayersError) setMaxPlayersError('');
          }}
          maxPlayersError={maxPlayersError}
          regDeadline={regDeadline}
          onChangeRegDeadline={(val) => {
            setRegDeadline(val);
            if (regDeadlineError) setRegDeadlineError('');
          }}
          regDeadlineError={regDeadlineError}
          startDate={startDate}
          onChangeStartDate={(val) => {
            setStartDate(val);
            if (startDateError) setStartDateError('');
          }}
          startDateError={startDateError}
          endDate={endDate}
          onChangeEndDate={(val) => {
            setEndDate(val);
            if (endDateError) setEndDateError('');
          }}
          endDateError={endDateError}
          dateOrderError={dateOrderError}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
          onSubmit={handleSubmitTournament}
          onCancel={() => {
            setView('list');
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* ══ SINGLE-GAME MANAGEMENT VIEW ═════════════════════════ */}
      {view === 'mgmt' && activeTournament && (
        <TournamentMgmt
          tournament={activeTournament}
          gameName={
            approvedGames.find(
              (gx) => String(gx.game_id || gx.id) === String(activeTournament.game_id)
            )?.game_name || 'Chess'
          }
          matches={activeMatches}
          users={users}
          onBack={() => {
            setView('list');
          }}
          onStartTournament={handleStartTournament}
          onAdvanceRound={handleAdvanceRound}
          onForceWinner={handleForceWinner}
          onExportResults={() => showToast('Downloading match logs…', 'info')}
          onPauseTournament={handlePauseTournament}
          onResumeTournament={handleResumeTournament}
          onCancelTournament={handleCancelTournament}
          onDeclareWinner={handleDeclareWinner}
          onExtendDeadline={handleExtendDeadline}
        />
      )}

      {/* ══ MULTI-GAME FEST MANAGEMENT VIEW ═════════════════════ */}
      {view === 'mgmt-multi' && activeFest && (
        <TournamentMultiMgmt
          fest={activeFest}
          stages={activeFestStages}
          overall={activeFestOverall}
          games={approvedGames}
          onBack={() => {
            setView('list');
          }}
          onStartStage={handleStartFestStage}
          onCompleteStage={handleCompleteFestStage}
        />
      )}

      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => dispatch(clearPublisherToast())}
        />
      )}

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmStyle={confirmModal.variant}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
      />
    </div>
  );
}

export default PublishTournament;
