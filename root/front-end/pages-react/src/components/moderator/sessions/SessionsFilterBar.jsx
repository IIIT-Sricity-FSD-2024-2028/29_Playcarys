import React from 'react';

export function SessionsFilterBar({
  statusFilter,
  onStatusChange,
  modeFilter,
  onModeChange
}) {
  return (
    <div className="filter-bar sessions-filter-bar">
      <select
        className="form-select sessions-filter-select"
        id="status-filter"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{ width: '180px' }}
      >
        <option value="">All Matches</option>
        <option value="in-progress">Being Played</option>
        <option value="completed">Finished</option>
      </select>
      <select
        className="form-select sessions-filter-select"
        id="mode-filter"
        value={modeFilter}
        onChange={(e) => onModeChange(e.target.value)}
        style={{ width: '180px' }}
      >
        <option value="">All Modes</option>
        <option value="casual">Casual</option>
        <option value="ranked">Ranked</option>
        <option value="tournament">Tournament</option>
      </select>
    </div>
  );
}

export default SessionsFilterBar;
