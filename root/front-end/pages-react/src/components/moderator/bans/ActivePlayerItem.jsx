import React from 'react';

export function ActivePlayerItem({ player, profile, onBan }) {
  const name = player.username || player.user_name || 'Unknown';
  const avatarText = player.avatar || name.slice(0, 2).toUpperCase();
  const level = player.level || profile?.level || 1;
  const wins = player.wins || 0;
  const losses = player.losses || 0;
  const matches = player.matches || 0;
  const wr = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  const carysPoints = profile?.carys_points || 0;

  return (
    <div className="list-item player-list-item">
      <div className="avatar">{avatarText}</div>
      <div className="list-item-info player-item-info">
        <div className="list-item-title player-item-title">{name}</div>
        <div className="list-item-sub player-item-sub text-sm">
          Lv.{level} · {wins}W / {losses}L · {wr}% WR · {carysPoints} PCP
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
        onClick={() => onBan(player)}
      >
        🚫 Ban
      </button>
    </div>
  );
}

export default ActivePlayerItem;
