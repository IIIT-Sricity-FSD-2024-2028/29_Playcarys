import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import publisherService, { getDatabase } from '../../services/publisherService';
import TournamentCard from '../../components/publisher/tournament/TournamentCard';
import TournamentEditor from '../../components/publisher/tournament/TournamentEditor';
import TournamentMgmt from '../../components/publisher/tournament/TournamentMgmt';
import TournamentMultiMgmt from '../../components/publisher/tournament/TournamentMultiMgmt';
import ConfirmModal from '../../components/publisher/tournament/ConfirmModal';
import Toast from '../../components/common/Toast';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/publisher/tournament.css';

export function PublishTournament() {
  const { user, loading: authLoading } = useContext(AuthContext);

  // Active view: 'list' | 'editor' | 'mgmt' | 'mgmt-multi'
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);

  // Data collections
  const [tournaments, setTournaments] = useState([]);
  const [fests, setFests] = useState([]);
  const [approvedGames, setApprovedGames] = useState([]);
  const [users, setUsers] = useState([]);

  // Toast & Modal
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    confirmStyle: 'primary'
  });

  // Editor form state
  const [editId, setEditId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState('single');
  const [selectedVisibility, setSelectedVisibility] = useState('public');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [gameError, setGameError] = useState('');
  const [stages, setStages] = useState([]);
  const [stageError, setStageError] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [prize, setPrize] = useState('');
  const [prizeError, setPrizeError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('32');
  const [maxPlayersError, setMaxPlayersError] = useState('');
  const [regDeadline, setRegDeadline] = useState('');
  const [regDeadlineError, setRegDeadlineError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [dateOrderError, setDateOrderError] = useState('');

  // Single-game management state
  const [activeTournament, setActiveTournament] = useState(null);
  const [activeMatches, setActiveMatches] = useState([]);

  // Multi-game fest management state
  const [activeFest, setActiveFest] = useState(null);
  const [activeFestStages, setActiveFestStages] = useState([]);
  const [activeFestOverall, setActiveFestOverall] = useState(null);

  // Load initial publisher tournament data
  const loadData = async () => {
    if (!user || user.role !== 'publisher') return;
    setLoading(true);

    const db = getDatabase();
    setUsers(db.users || []);

    const uid = user.userId || user.id;
    const myGames = publisherService.getPublisherApprovedGames(uid);
    setApprovedGames(myGames);

    const localTourns = publisherService.getPublisherTournaments(uid);
    setTournaments(localTourns);

    const backendFests = await publisherService.fetchMyFests(uid);
    setFests(backendFests);

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user && user.role === 'publisher') {
      loadData();
    }
  }, [authLoading, user]);

  function showToast(message, type = 'info') {
    setToast({ message, type });
  }

  function openConfirm(title, message, onConfirm, confirmText = 'Confirm', confirmStyle = 'primary') {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      confirmText,
      confirmStyle
    });
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
      setSelectedGameId(approvedGames.length > 0 ? String(approvedGames[0].id || approvedGames[0].game_id) : '');
      setName('');
      setDescription('');
      setPrize('');
      setMaxPlayers('32');
      setRegDeadline('');
      setStartDate('');
      setEndDate('');
    } else {
      const db = getDatabase();
      const t = (db.tournaments || []).find((x) => String(x.tournament_id || x.id) === String(id));
      if (t) {
        setSelectedGameId(String(t.game_id));
        setName(t.tournament_name || t.name || '');
        setDescription(t.desc || '');
        setPrize(t.prize || '');
        setMaxPlayers(String(t.maxParticipants || 32));
        setRegDeadline(t.regClose || '');
        setStartDate(t.start_date || t.startDate || '');
        setEndDate(t.end_date || '');
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
    setStages((prev) => [
      ...prev,
      {
        rowId: Date.now() + Math.random(),
        game_id: defaultGameId,
        format: 'score',
        metric: 'score',
        direction: 'high',
        metric_label: 'Score',
        points_weight: 1
      }
    ]);
  }

  function handleUpdateStage(rowId, field, value) {
    setStages((prev) =>
      prev.map((s) => {
        if (s.rowId !== rowId) return s;
        return {
          ...s,
          [field]: field === 'points_weight' ? parseFloat(value) || 1 : value
        };
      })
    );
  }

  function handleRemoveStage(rowId) {
    setStages((prev) => prev.filter((s) => s.rowId !== rowId));
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

      if (!prize.trim()) {
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
    setCurrentStep((prev) => Math.max(1, prev - 1));
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
    if (!vName || !vDesc || !vPrize) {
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

    const uid = parseInt(user?.userId || user?.id || 1, 10);

    // Multi-game fests (backend API)
    if (selectedType === 'multi' && !editId) {
      const payload = {
        organizer: uid,
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
        const created = await publisherService.createMultiGameFest(payload);
        showToast('Multi-game fest published! 🏅', 'success');
        if (selectedVisibility === 'private' && created?.invite_code) {
          openConfirm(
            'Invite Code',
            `Share this code with the players you want to invite:\n\n${created.invite_code}`,
            () => {},
            'Close',
            'primary'
          );
        }
      } catch (e) {
        showToast(e.message || 'Could not publish tournament — is backend running?', 'error');
        return;
      }

      await loadData();
      setView('list');
      return;
    }

    // Single-game (local DB flow)
    publisherService.saveSingleTournament(
      {
        name: vName,
        desc: vDesc,
        prize: vPrize,
        maxParticipants: maxPlayers,
        regClose: regDeadline,
        startDate,
        endDate,
        gameId: selectedGameId
      },
      editId,
      uid
    );

    if (editId) {
      showToast('Tournament updated! ✅', 'success');
    } else {
      showToast('Tournament published! 🏆', 'success');
    }

    await loadData();
    setView('list');
  }

  // Delete tournament
  function handleDeleteTournament(id) {
    openConfirm(
      'Delete Tournament',
      'Permanently delete this tournament and all its matches? This cannot be undone.',
      () => {
        publisherService.deleteSingleTournament(id);
        showToast('Tournament successfully deleted', 'success');
        loadData();
      },
      'Delete',
      'danger'
    );
  }

  // Single-game Management view
  function handleOpenMgmt(id) {
    const db = getDatabase();
    const t = (db.tournaments || []).find((x) => String(x.tournament_id || x.id) === String(id));
    if (!t) return;

    setActiveTournament(t);
    const matches = (db.tournament_matches || []).filter(
      (m) => String(m.tournamentId) === String(id)
    );
    setActiveMatches(matches);
    setView('mgmt');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleStartTournament() {
    if (!activeTournament) return;
    const tid = activeTournament.tournament_id || activeTournament.id;

    openConfirm(
      'Start Tournament',
      'This will generate the bracket and close registration. Continue?',
      () => {
        try {
          publisherService.startSingleTournament(tid);
          showToast('Tournament Started! Bracket generated.', 'success');
          handleOpenMgmt(tid);
          loadData();
        } catch (e) {
          showToast(e.message || 'Failed to start tournament', 'error');
        }
      },
      'Start Now',
      'warning'
    );
  }

  function handleAdvanceRound() {
    if (!activeTournament) return;
    const tid = activeTournament.tournament_id || activeTournament.id;
    const round = activeTournament.currentRound || 1;

    openConfirm(
      'Advance Round',
      `Close Round ${round} and open Round ${round + 1}?`,
      () => {
        try {
          const res = publisherService.advanceSingleTournamentRound(tid);
          if (res.completed) {
            showToast('Final round complete — tournament finished!', 'success');
          } else {
            showToast(`Round ${res.nextRound} is now live.`, 'success');
          }
          handleOpenMgmt(tid);
          loadData();
        } catch (e) {
          showToast(e.message || 'Failed to advance round', 'error');
        }
      },
      'Advance Round',
      'primary'
    );
  }

  function handleForceWinner(matchId, winnerId, p1Name) {
    openConfirm(
      'Manual Override',
      `Declare ${p1Name || winnerId} the winner of this match?`,
      () => {
        if (!activeTournament) return;
        const tid = activeTournament.tournament_id || activeTournament.id;
        const m = activeMatches.find((x) => x.match_id === matchId);
        if (!m) return;

        publisherService.forceMatchWinner(matchId, winnerId, m.player1);
        showToast('Match result recorded!', 'success');
        handleOpenMgmt(tid);
      },
      'Confirm Winner',
      'primary'
    );
  }

  // Multi-game Fest Management view
  async function handleOpenMgmtMulti(id) {
    try {
      const details = await publisherService.getFestDetails(id);
      setActiveFest(details.t);
      setActiveFestStages(details.stages || []);
      setActiveFestOverall(details.overall);
      setView('mgmt-multi');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      showToast(e.message || 'Could not load this fest from backend.', 'error');
    }
  }

  async function handleStartFestStage(stageId) {
    if (!activeFest) return;
    const uid = user?.userId || user?.id || 1;
    try {
      await publisherService.startFestStage(activeFest.tournament_id, stageId, uid);
      showToast('Stage started!', 'success');
      handleOpenMgmtMulti(activeFest.tournament_id);
    } catch (e) {
      showToast(e.message || 'Could not start stage.', 'error');
    }
  }

  function handleCompleteFestStage(stageId) {
    if (!activeFest) return;
    const uid = user?.userId || user?.id || 1;

    openConfirm(
      'Close Stage',
      'Close this stage and lock in its standings?',
      async () => {
        try {
          await publisherService.completeFestStage(activeFest.tournament_id, stageId, uid);
          showToast('Stage closed!', 'success');
          handleOpenMgmtMulti(activeFest.tournament_id);
        } catch (e) {
          showToast(e.message || 'Could not close stage.', 'error');
        }
      },
      'Close Stage',
      'primary'
    );
  }

  if (authLoading) {
    return <LoadingState message="Loading Publisher Studio…" />;
  }

  if (!authLoading && (!user || user.role !== 'publisher')) {
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
              const db = getDatabase();
              const g = (db.games || []).find(
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
          onCancel={() => setView('list')}
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
          onBack={() => setView('list')}
          onStartTournament={handleStartTournament}
          onAdvanceRound={handleAdvanceRound}
          onForceWinner={handleForceWinner}
          onExportResults={() => showToast('Downloading match logs…', 'info')}
        />
      )}

      {/* ══ MULTI-GAME FEST MANAGEMENT VIEW ═════════════════════ */}
      {view === 'mgmt-multi' && activeFest && (
        <TournamentMultiMgmt
          fest={activeFest}
          stages={activeFestStages}
          overall={activeFestOverall}
          games={approvedGames}
          onBack={() => setView('list')}
          onStartStage={handleStartFestStage}
          onCompleteStage={handleCompleteFestStage}
        />
      )}

      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmStyle={confirmModal.confirmStyle}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default PublishTournament;
