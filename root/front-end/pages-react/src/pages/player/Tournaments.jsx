import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { getDatabase, sameId, hydrateFromServer } from '../../services/playerService';
import {
  kindOf,
  tournamentService
} from '../../services/tournamentService';
import TournamentFilters from '../../components/player/tournaments/TournamentFilters';
import TournamentSection from '../../components/player/tournaments/TournamentSection';
import TournamentDetails from '../../components/player/tournaments/TournamentDetails';
import TournamentRegistrationModal from '../../components/player/tournaments/TournamentRegistrationModal';
import '../../styles/player/tournaments.css';

export function Tournaments() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const userId = user?.id || user?.user_id || 7;

  const [kindFilter, setKindFilter] = useState('all');
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [regModalTournament, setRegModalTournament] = useState(null);
  const [dbVersion, setDbVersion] = useState(0);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  // Handle direct-link ?highlight=<id>
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get('highlight');
    if (highlight) {
      setSelectedTournamentId(highlight);
    }
  }, [location.search]);

  // Hydrate tournaments from backend on mount
  useEffect(() => {
    hydrateFromServer(['tournaments', 'player_tournament', 'team_tournament', 'teams', 'games'])
      .then(() => setDbVersion((v) => v + 1))
      .catch(() => {});
  }, []);

  // Listen to cross-tab storage changes
  useEffect(() => {
    const onStorage = () => setDbVersion((v) => v + 1);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const db = getDatabase();

  // Suspended account check
  const dbUser = (db.users || []).find((u) => sameId(u.id || u.user_id, userId));
  if (dbUser && dbUser.status === 'suspended') {
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
    if (t.visibility !== 'private') return true;
    const isOrg = sameId(t.organizer || t.organizer_id, userId);
    const inReg = (t.registeredPlayers || []).map(String).includes(String(userId));
    return isOrg || inReg;
  };

  let allTournaments = (db.tournaments || []).filter(isVisible);

  if (kindFilter !== 'all') {
    allTournaments = allTournaments.filter((t) => kindOf(t, db) === kindFilter);
  }

  const activeTournaments = allTournaments.filter((t) => t.status === 'in-progress');
  const upcomingTournaments = allTournaments.filter((t) => t.status === 'upcoming');
  const completedTournaments = allTournaments.filter((t) => t.status === 'completed');

  // Withdrawal action handler
  function handleWithdraw(tournament) {
    const isTeam = !!tournament.team_size;
    const confirmMsg = isTeam
      ? `Withdraw your team from ${tournament.name}?`
      : `Withdraw from ${tournament.name}?`;

    if (window.confirm(confirmMsg)) {
      tournamentService
        .withdraw(tournament, userId)
        .then((res) => {
          showToast(
            res.teamName ? `${res.teamName} withdrawn from ${tournament.name}` : `Withdrew from ${tournament.name}`,
            'info'
          );
          setDbVersion((v) => v + 1);
        })
        .catch((err) => {
          showToast(err.message || 'Could not withdraw from tournament.', 'error');
        });
    }
  }

  // Selected tournament details view
  const selectedTournament = selectedTournamentId
    ? (db.tournaments || []).find((t) => sameId(t.id || t.tournament_id, selectedTournamentId))
    : null;

  return (
    <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {selectedTournament ? (
        <TournamentDetails
          tournament={selectedTournament}
          userId={userId}
          db={db}
          onBack={() => setSelectedTournamentId(null)}
          onOpenRegModal={(t) => setRegModalTournament(t)}
          onRefresh={() => setDbVersion((v) => v + 1)}
          onShowToast={showToast}
        />
      ) : (
        <div className="page-content" id="list-view">
          <TournamentFilters
            kindFilter={kindFilter}
            onSelectKind={setKindFilter}
          />

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
            db={db}
            onSelect={(id) => setSelectedTournamentId(id)}
            onRegister={(t) => setRegModalTournament(t)}
            onWithdraw={handleWithdraw}
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
            db={db}
            onSelect={(id) => setSelectedTournamentId(id)}
            onRegister={(t) => setRegModalTournament(t)}
            onWithdraw={handleWithdraw}
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
            db={db}
            onSelect={(id) => setSelectedTournamentId(id)}
            onRegister={(t) => setRegModalTournament(t)}
            onWithdraw={handleWithdraw}
          />
        </div>
      )}

      {/* Registration Modal */}
      {regModalTournament && (
        <TournamentRegistrationModal
          tournament={regModalTournament}
          userId={userId}
          db={db}
          isOpen={true}
          onClose={() => setRegModalTournament(null)}
          onSuccess={() => setDbVersion((v) => v + 1)}
          onShowToast={showToast}
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
