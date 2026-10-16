import React from 'react';
import { formatDate } from '../sessions/SessionKpiCards';

export function BannedPlayerItem({ player, ban, profile, onUnban }) {
  const name = player.username || player.user_name || 'Unknown';
  const avatarText = player.avatar || name.slice(0, 2).toUpperCase();
  const level = player.level || profile?.level || 1;
  const wins = player.wins || 0;
  const losses = player.losses || 0;
  const carysPoints = profile?.carys_points || 0;

  return (
    <div className="list-item player-list-item">
      <div className="avatar">{avatarText}</div>
      <div className="list-item-info player-item-info">
        <div className="player-item-title-row">
          <span className="list-item-title player-item-title">{name}</span>
          <span className="badge badge-banned">Banned</span>
        </div>
        <div className="list-item-sub player-item-sub">
          Lv.{level} · {wins}W / {losses}L · {carysPoints} PCP
        </div>
        {ban && (
          <div className="ban-info-row">
            📅 Banned {ban.bannedDate || ''} · Expires: {formatDate(ban.expiresDate)} · Reason: {ban.reason || '—'}
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
        onClick={() => onUnban(player)}
      >
        ✅ Unban
      </button>
    </div>
  );
}

export default BannedPlayerItem;
