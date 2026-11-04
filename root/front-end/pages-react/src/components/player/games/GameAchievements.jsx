import React, { useState, useEffect } from 'react';
import playerService from '../../../services/playerService';

export function GameAchievements({ gameId, userId }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || gameId === 'undefined') {
      setAchievements([]);
      setLoading(false);
      return;
    }
    let isCurrent = true;
    setLoading(true);

    playerService
      .fetchAchievements(gameId, userId)
      .then((data) => {
        if (!isCurrent) return;
        if (Array.isArray(data) && data.length > 0) {
          setAchievements(data);
        } else {
          setAchievements([]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isCurrent) return;
        setAchievements([]);
        setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [gameId, userId]);

  if (loading || !achievements.length) {
    return null;
  }

  const earned = achievements.filter((a) => !!a.unlocked).length;

  return (
    <div className="card mb-2" id="game-achievements" style={{ marginBottom: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.85rem'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: "'Orbitron', monospace" }}>
          🏅 Achievements
        </h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {earned} of {achievements.length} unlocked
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: '0.6rem'
        }}
      >
        {achievements.map((a, i) => {
          const got = !!a.unlocked;
          return (
            <div
              key={a.id || a.achievement_id || i}
              style={{
                display: 'flex',
                gap: '0.65rem',
                alignItems: 'flex-start',
                padding: '0.7rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                background: got ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                border: `1px solid ${got ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-primary)'}`,
                opacity: got ? '1' : '0.72'
              }}
            >
              <div
                style={{
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  filter: got ? 'none' : 'grayscale(1)'
                }}
              >
                {a.icon || '🏅'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {a.name || 'Achievement'}{' '}
                  {got && (
                    <span style={{ color: 'var(--accent-green)', fontSize: '0.7rem' }}>✓</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.35,
                    marginTop: '0.15rem'
                  }}
                >
                  {a.description || ''}
                </div>
                {(a.carys_reward || a.xp_reward) && (
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--accent-yellow)',
                      marginTop: '0.25rem'
                    }}
                  >
                    {a.carys_reward ? `+${a.carys_reward} Carys` : ''}
                    {a.carys_reward && a.xp_reward ? ' · ' : ''}
                    {a.xp_reward ? `+${a.xp_reward} XP` : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GameAchievements;
