/*
 * Concepts used in this component:
 *  - Components, Props (active, addAudit), State (create dialog, form, errors), Events (clicks, typing),
 *    Lists (tournament cards), Hooks (useState, useContext), Forms (controlled create form with
 *    validation), Context (AdminContext), Callbacks (confirmAction runs End / Delete only after "Confirm")
 *
 * "Tournament Control" section of the old hub.html: tournament numbers, one card per tournament with
 * Start / End / Delete, and the Create Tournament dialog.
 */
import React, { useState, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import KpiCard from './KpiCard';
import CreateTournamentModal from './CreateTournamentModal';
import StatusBadge from '../common/StatusBadge';
import { validateField } from '../../../services/adminValidation';
import { getDB, formatDate } from '../../../services/adminService';
import {
  tournamentCounts,
  createTournament,
  findTournament,
  setTournamentStatus,
  deleteTournament
} from '../../../services/adminHubService';

const NO_ERRORS = { name: '', desc: '', max: '', start: '' };

// "2026-10-14" for today, or for `days` days from now.
function isoDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
}

export function TournamentsSection(props) {
  const { active, addAudit } = props;
  const { toast, confirmAction, refresh } = useContext(AdminContext);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', desc: '', gameId: '', max: '32', start: '', prize: '' });
  const [errors, setErrors] = useState(NO_ERRORS);

  const db = getDB();
  const counts = tournamentCounts();
  const approvedGames = db.games.filter((g) => g.status === 'approved');

  // The dialog opens with the first approved game chosen and the start a week from now.
  function openCreate() {
    setForm({
      name: '',
      desc: '',
      gameId: approvedGames.length ? approvedGames[0].id : '',
      max: '32',
      start: isoDate(7),
      prize: ''
    });
    setErrors(NO_ERRORS);
    setModalOpen(true);
  }

  function handleFieldChange(field, value) {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  }

  function handleCreate() {
    const nameMsg = validateField(form.name, [{ type: 'required' }, { type: 'minLen', n: 5, msg: 'Min 5 characters' }]);
    const descMsg = validateField(form.desc, [{ type: 'required' }, { type: 'minLen', n: 10, msg: 'Min 10 characters' }]);
    const maxMsg = validateField(form.max, [{ type: 'required' }, { type: 'numeric' }, { type: 'custom', fn: (v) => v >= 4 && v <= 1024, msg: 'Must be between 4 and 1024' }]);
    const startMsg = validateField(form.start, [{ type: 'required', msg: 'Start date required' }]);
    setErrors({ name: nameMsg, desc: descMsg, max: maxMsg, start: startMsg });
    if (nameMsg || descMsg || maxMsg || startMsg) return;

    createTournament(form.name, form.desc, form.gameId, form.max, form.start, form.prize, addAudit);
    toast.success('Tournament created!');
    setModalOpen(false);
    refresh();
  }

  function handleStart(id) {
    const t = findTournament(id);
    setTournamentStatus(t, 'in-progress', 'started', addAudit);
    toast.success(`${t.name} started!`);
    refresh();
  }

  function handleEnd(id) {
    const t = findTournament(id);
    confirmAction('End Tournament', `Mark "${t.name}" as completed?`, () => {
      setTournamentStatus(t, 'completed', 'completed', addAudit);
      toast.info(`${t.name} completed`);
      refresh();
    }, 'info');
  }

  function handleDelete(id) {
    const t = findTournament(id);
    confirmAction('Delete Tournament', `Delete "${t.name}"?`, () => {
      deleteTournament(t, addAudit);
      toast.success('Tournament deleted');
      refresh();
    });
  }

  return (
    <>
      <div className={'hub-section' + (active ? ' active' : '')} id="sec-tournaments">
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Tournament Control</h2>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create Tournament</button>
        </div>

        <div className="kpi-row mb-2">
          <KpiCard color="var(--accent-green)" label="Active" value={counts.active} icon="🔴" />
          <KpiCard color="var(--accent-purple)" label="Upcoming" value={counts.upcoming} icon="📅" />
          <KpiCard color="var(--accent-cyan)" label="Completed" value={counts.done} icon="✅" />
          <KpiCard color="var(--accent-yellow)" label="Total Players" value={counts.players} icon="👥" />
        </div>

        <div id="tournaments-list">
          {db.tournaments.map((t) => (
            <div className="tournament-control-card" key={t.id}>
              <span style={{ fontSize: '2rem' }}>🏆</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: "'Orbitron',monospace", fontSize: '0.9rem', fontWeight: 700 }}>{t.name}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>🎮 {t.game}</span>
                  <span>👥 {t.participants}/{t.maxParticipants}</span>
                  <span>📅 {formatDate(t.startDate)}</span>
                  <span style={{ color: 'var(--accent-yellow)' }}>💰 {t.prize}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                {t.status === 'upcoming' ? <button className="btn btn-green btn-sm" onClick={() => handleStart(t.id)}>▶️ Start</button> : null}
                {t.status === 'in-progress' ? <button className="btn btn-ghost btn-sm" onClick={() => handleEnd(t.id)}>⏹ End</button> : null}
                <button className="btn btn-red btn-sm" onClick={() => handleDelete(t.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateTournamentModal
        open={modalOpen}
        games={approvedGames}
        form={form}
        errors={errors}
        minDate={isoDate(0)}
        onFieldChange={handleFieldChange}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}

export default TournamentsSection;
