import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchTournaments,
  fetchTournamentById,
  openTournamentDetails,
  closeTournamentDetails,
  openRegistrationModal,
  closeRegistrationModal,
  openJoinByIdModal,
  closeJoinByIdModal,
  setTournamentFilters
} from '../../features/tournaments/tournamentSlice';
import { withdrawFromTournament } from '../../features/tournaments/registrationSlice';
import {
  selectAllTournaments,
  selectTournamentsStatus,
  selectTournamentsError
} from '../../features/tournaments/selectors';
import { selectAuthUser } from '../../features/auth/selectors';
import { sameId } from '../../services/playerService';
import {
  kindOf,
  isCommunityMember
} from '../../services/tournamentService';
import TournamentFilters from '../../components/player/tournaments/TournamentFilters';
import TournamentSection from '../../components/player/tournaments/TournamentSection';
import TournamentDetails from '../../components/player/tournaments/TournamentDetails';
import TournamentRegistrationModal from '../../components/player/tournaments/TournamentRegistrationModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import JoinTournamentByIdModal from '../../components/player/tournaments/JoinTournamentByIdModal';
import '../../styles/player/tournaments.css';

export function Tournaments() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const storeTournaments = useAppSelector(selectAllTournaments);
  const tournamentsStatus = useAppSelector(selectTournamentsStatus);
  const tournamentsError = useAppSelector(selectTournamentsError);

  const location = useLocation();
  const navigate = useNavigate();
  const { tournamentId: routeTournamentId } = useParams();
  const userId = user?.id ?? user?.userId ?? user?.user_id ?? 7;

  const [kindFilter, setKindFilter] = useState('all');
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [regModalTournament, setRegModalTournament] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [showJoinByIdModal, setShowJoinByIdModal] = useState(false);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  // Fetch tournaments into Redux store
  useEffect(() => {
    if (tournamentsStatus === 'idle') {
      dispatch(fetchTournaments());
    }
  }, [dispatch, tournamentsStatus]);

  // Handle direct-link ?highlight=<id> or :tournamentId
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get('highlight') || params.get('id') || routeTournamentId;
    const shouldRegister = params.get('register') === 'true';
    if (highlight) {
      setSelectedTournamentId(highlight);
      dispatch(openTournamentDetails(highlight));
      if (!storeTournaments.some((x) => sameId(x.id || x.tournament_id, highlight))) {
        dispatch(fetchTournamentById(highlight));
      }
      if (shouldRegister) {
        const t = storeTournaments.find((x) => sameId(x.id || x.tournament_id, highlight));
        if (t) {
          setRegModalTournament(t);
          dispatch(openRegistrationModal(highlight));
        }
      }
    } else if (!routeTournamentId) {
      setSelectedTournamentId(null);
      dispatch(closeTournamentDetails());
    }
  }, [location.search, routeTournamentId, storeTournaments, dispatch]);

  // Suspended account check
  if (user && user.status === 'suspended') {
    return (
      <div className="page-wrapper">
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏸</div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", marginBottom: '0.5rem', color: '#fff' }}>
            Account Suspended
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto', lineHeight: 1.5 }}>
            Your account is currently suspended. You cannot participate in tournaments, but you can still access your messages via the menu to contact support.
          </p>
        </div>
      </div>
    );
  }

  // Visibility filtering (private tournaments visible only to organizer or registered)
  const isVisible = (t) => {
    const isOrg = sameId(t.organizer || t.organizer_id, userId);
    const inReg = (t.registeredPlayers || t.registered_player_ids || []).map(String).includes(String(userId))
      || (t.registered_team_ids || []).map(String).includes(String(userId));

    if (t.group_id != null) {
      const isMember = isCommunityMember(t.group_id, userId);
      if (!isMember && !isOrg && !inReg) {
        return false;
      }
    }

    if (t.visibility === 'private') return isOrg || inReg;
    return true;
  };

  let allTournaments = storeTournaments.filter(isVisible);

  if (kindFilter !== 'all') {
    allTournaments = allTournaments.filter((t) => (t.kind || kindOf(t)) === kindFilter);
  }

  const activeTournaments = allTournaments.filter((t) => t.status === 'in-progress');
  const upcomingTournaments = allTournaments.filter((t) => t.status === 'upcoming');
  const completedTournaments = allTournaments.filter((t) => t.status === 'completed');

  // Withdrawal action prompt
  function handleWithdraw(tournament) {
    if (!tournament) return;
    const tid = tournament.tournament_id || tournament.id;
    if (!tid) {
      showToast('Tournament ID is missing.', 'error');
      return;
    }
    if (withdrawingId) return;
    setWithdrawTarget(tournament);
  }

  // Confirmed withdrawal execution
  async function handleConfirmWithdraw() {
    if (!withdrawTarget || withdrawingId) return;
    const tournament = withdrawTarget;
    const tid = tournament.tournament_id || tournament.id;
    if (!tid) {
      showToast('Tournament ID is missing.', 'error');
      return;
    }

    const isTeam = !!tournament.team_size;
    const tourneyName = tournament.tournament_name || tournament.name || tournament.desc || 'this tournament';

    setWithdrawingId(tid);
    try {
      // Dispatch withdrawal to Redux store
      await dispatch(withdrawFromTournament({
        tournamentId: tid,
        playerId: userId,
        teamId: isTeam ? tournament.team_id : undefined
      })).unwrap();

      showToast(`Withdrew from ${tourneyName}`, 'info');

      // Refresh tournament in Redux store
      dispatch(fetchTournamentById(tid));
      dispatch(fetchTournaments());
    } catch (err) {
      showToast(err.message || 'Could not withdraw from tournament.', 'error');
    } finally {
      setWithdrawTarget(null);
      setWithdrawingId(null);
    }
  }

  // Selected tournament details view
  const selectedTournament = selectedTournamentId
    ? storeTournaments.find((t) => sameId(t.id || t.tournament_id, selectedTournamentId))
    : null;

  return (
    <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {selectedTournament ? (
        <TournamentDetails
          tournament={selectedTournament}
          userId={userId}
          onBack={() => {
            dispatch(closeTournamentDetails());
            setSelectedTournamentId(null);
            navigate('/player/tournaments', { replace: true });
          }}
          onOpenRegModal={(t) => {
            dispatch(openRegistrationModal(t.id || t.tournament_id));
            setRegModalTournament(t);
          }}
          onRefresh={async () => {
            dispatch(fetchTournaments());
            if (selectedTournamentId) {
              dispatch(fetchTournamentById(selectedTournamentId));
            }
          }}
          onShowToast={showToast}
          onWithdraw={handleWithdraw}
          withdrawingId={withdrawingId}
        />
      ) : (
        <div className="page-content" id="list-view">
          <TournamentFilters
            kindFilter={kindFilter}
            onSelectKind={(k) => {
              dispatch(setTournamentFilters({ kindFilter: k }));
              setKindFilter(k);
            }}
            onOpenJoinById={() => {
              dispatch(openJoinByIdModal());
              setShowJoinByIdModal(true);
            }}
          />

          {tournamentsStatus === 'loading' && storeTournaments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading tournaments...
            </div>
          )}

          {tournamentsStatus === 'failed' && storeTournaments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
              Failed to load tournaments: {tournamentsError}
            </div>
          )}

          <TournamentSection
            title="Live Now"
            isLive={true}
            tournaments={activeTournaments}
            emptyIcon="🔥"
            emptyMessage={
              kindFilter === 'all'
                ? 'No live tournaments right now'
                : `No live ${kindFilter} tournaments right now`
            }
            userId={userId}
            onSelect={(id) => {
              dispatch(openTournamentDetails(id));
              setSelectedTournamentId(id);
              navigate(`/player/tournaments?highlight=${id}`);
            }}
            onRegister={(t) => {
              dispatch(openRegistrationModal(t.id || t.tournament_id));
              setRegModalTournament(t);
            }}
            onWithdraw={handleWithdraw}
            withdrawingId={withdrawingId}
          />

          <TournamentSection
            title="Upcoming"
            isLive={false}
            tournaments={upcomingTournaments}
            emptyIcon="📅"
            emptyMessage={
              kindFilter === 'all'
                ? 'No upcoming tournaments — why not create one?'
                : `No upcoming ${kindFilter} tournaments — why not create one?`
            }
            userId={userId}
            onSelect={(id) => {
              dispatch(openTournamentDetails(id));
              setSelectedTournamentId(id);
              navigate(`/player/tournaments?highlight=${id}`);
            }}
            onRegister={(t) => {
              dispatch(openRegistrationModal(t.id || t.tournament_id));
              setRegModalTournament(t);
            }}
            onWithdraw={handleWithdraw}
            withdrawingId={withdrawingId}
          />

          <TournamentSection
            title="Completed"
            isLive={false}
            tournaments={completedTournaments}
            emptyIcon="✅"
            emptyMessage={
              kindFilter === 'all'
                ? 'No completed tournaments yet'
                : `No completed ${kindFilter} tournaments yet`
            }
            userId={userId}
            onSelect={(id) => {
              dispatch(openTournamentDetails(id));
              setSelectedTournamentId(id);
              navigate(`/player/tournaments?highlight=${id}`);
            }}
            onRegister={(t) => {
              dispatch(openRegistrationModal(t.id || t.tournament_id));
              setRegModalTournament(t);
            }}
            onWithdraw={handleWithdraw}
            withdrawingId={withdrawingId}
          />
        </div>
      )}

      {/* Registration Modal */}
      {regModalTournament && (
        <TournamentRegistrationModal
          tournament={regModalTournament}
          userId={userId}
          isOpen={true}
          onClose={() => {
            dispatch(closeRegistrationModal());
            setRegModalTournament(null);
          }}
          onSuccess={async () => {
            dispatch(fetchTournaments());
            if (selectedTournamentId) {
              dispatch(fetchTournamentById(selectedTournamentId));
            }
          }}
          onShowToast={showToast}
        />
      )}

      {/* Join By ID Modal */}
      <JoinTournamentByIdModal
        isOpen={showJoinByIdModal}
        onClose={() => {
          dispatch(closeJoinByIdModal());
          setShowJoinByIdModal(false);
        }}
        userId={userId}
        onShowToast={showToast}
        onSelectTournament={(tid, tournament) => {
          dispatch(openTournamentDetails(tid));
          setSelectedTournamentId(tid);
          navigate(`/player/tournaments?highlight=${tid}`);
        }}
        onRegisterTournament={(tournament) => {
          dispatch(openRegistrationModal(tournament.id || tournament.tournament_id));
          setRegModalTournament(tournament);
        }}
      />

      {/* Withdraw Confirmation Modal */}
      {withdrawTarget && (
        <ConfirmModal
          isOpen={Boolean(withdrawTarget)}
          title="Withdraw"
          message={
            withdrawTarget.team_size
              ? `Withdraw your team from ${withdrawTarget.tournament_name || withdrawTarget.name || withdrawTarget.desc || 'this tournament'}?`
              : `Withdraw from ${withdrawTarget.tournament_name || withdrawTarget.name || withdrawTarget.desc || 'this tournament'}?`
          }
          confirmText="Confirm"
          cancelText="Cancel"
          confirmStyle="danger"
          loading={Boolean(withdrawingId)}
          loadingText="Withdrawing..."
          onCancel={() => {
            if (!withdrawingId) {
              setWithdrawTarget(null);
            }
          }}
          onConfirm={handleConfirmWithdraw}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.88rem',
            boxShadow: 'var(--shadow-modal)',
            background:
              toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6'
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default Tournaments;
