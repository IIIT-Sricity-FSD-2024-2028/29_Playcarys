/*
 * Concepts used in this component:
 *  - Components, Props (game, reviewerId), State (rows, loading result), Hooks (useState, useEffect,
 *    useContext), API calls (fetch the achievements, send Approve / Reject), Lists (one row per
 *    achievement), Events (button clicks), Context (AdminContext for the toast)
 *
 * "🏅 Proposed Achievements": achievements the publisher proposed for this game. They pay real
 * Carys, so each one is approved or rejected here, with the budget in view.
 */
import React, { useState, useEffect, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import { fetchAchievements, reviewAchievement } from '../../../services/adminReviewService';

export function ProposedAchievements(props) {
  const { game: g, reviewerId } = props;
  const { toast } = useContext(AdminContext);
  const [rows, setRows] = useState(null); // null = still loading
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const gid = g.game_id || g.id;

  useEffect(() => {
    fetchAchievements(gid)
      .then((list) => {
        setRows(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [gid, reloadKey]);

  function handleReview(achievementId, decision) {
    reviewAchievement(achievementId, decision, reviewerId)
      .then((body) => {
        toast.success(body.message || 'Done.');
        setReloadKey(reloadKey + 1);
      })
      .catch((e) => {
        // The budget refusal arrives here and names the real numbers, so show it as it is.
        toast.error(e.message);
      });
  }

  let countText = '';
  let budgetText = '';
  let list = null;

  if (failed) {
    list = <p className="text-muted" style={{ fontSize: '.82rem', margin: 0 }}>Could not load achievements.</p>;
  } else if (rows) {
    const pending = rows.filter((a) => (a.status || 'approved') === 'pending');
    const approved = rows.filter((a) => (a.status || 'approved') === 'approved');
    const committedCarys = approved.reduce((s, a) => s + (a.carys_reward || 0), 0);
    const budget = g.achievement_budget_carys != null ? g.achievement_budget_carys : 2000;
    budgetText = 'Committed ' + committedCarys + ' of ' + budget +
      ' Carys across ' + approved.length + ' approved achievement' + (approved.length === 1 ? '' : 's') + '.';
    countText = pending.length ? '(' + pending.length + ' awaiting you)' : '(none pending)';

    if (!rows.length) {
      list = <p className="text-muted" style={{ fontSize: '.82rem', margin: 0 }}>This publisher has not proposed any achievements.</p>;
    } else {
      list = rows.map((a) => {
        const st = a.status || 'approved';
        const isPending = st === 'pending';
        const colour = st === 'approved' ? 'var(--accent-green)' : st === 'rejected' ? 'var(--accent-red)' : 'var(--accent-yellow)';
        return (
          <div
            key={a.achievement_id}
            style={{
              display: 'flex', gap: '.6rem', alignItems: 'flex-start', padding: '.55rem .6rem', marginBottom: '.4rem',
              border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)'
            }}
          >
            <div style={{ fontSize: '1.3rem', lineHeight: 1 }}>{a.icon || '🏅'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.85rem', fontWeight: 700 }}>
                {a.name}{' '}
                <span style={{ fontSize: '.65rem', color: colour, textTransform: 'uppercase', marginLeft: '.35rem' }}>{st}</span>
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)' }}>{a.description || ''}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--accent-yellow)', marginTop: '.2rem' }}>
                code <code>{a.code}</code> · +{a.carys_reward || 0} Carys
                {a.xp_reward ? ' · +' + a.xp_reward + ' XP' : ''}
                {a.title_awarded ? ' · title “' + a.title_awarded + '”' : ''}
                {a.secret ? ' · secret' : ''}
              </div>
            </div>
            {isPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                <button className="btn btn-primary btn-sm" style={{ fontSize: '.68rem', padding: '.15rem .5rem' }} onClick={() => handleReview(a.achievement_id, 'approve')}>Approve</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '.68rem', padding: '.15rem .5rem', color: 'var(--accent-red)' }} onClick={() => handleReview(a.achievement_id, 'reject')}>Reject</button>
              </div>
            ) : null}
          </div>
        );
      });
    }
  }

  return (
    <div className="card mb-2">
      <h3 className="mb-2">🏅 Proposed Achievements <span className="text-muted" style={{ fontSize: '.8rem', fontWeight: 400 }} id="ach-count">{countText}</span></h3>
      <div id="ach-budget" style={{ fontSize: '.78rem', color: 'var(--text-secondary)', marginBottom: '.6rem' }}>{budgetText}</div>
      <div id="ach-list">{list}</div>
    </div>
  );
}

export default ProposedAchievements;
