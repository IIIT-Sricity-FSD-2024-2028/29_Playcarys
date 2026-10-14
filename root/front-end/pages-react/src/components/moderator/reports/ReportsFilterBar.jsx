import React from 'react';

export function ReportsFilterBar({
  searchFilter,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange
}) {
  return (
    <div className="reports-filter-bar filter-bar">
      <div className="reports-search-box">
        <span className="reports-search-icon">🔍</span>
        <input
          id="search-filter"
          type="text"
          className="form-input reports-search-input"
          placeholder="Search player name or report ID…"
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        id="status-filter"
        className="form-select reports-select"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="">All Reports</option>
        <option value="pending">Pending</option>
        <option value="under-review">Under Review</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
      </select>

      <select
        id="type-filter"
        className="form-select reports-select"
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
      >
        <option value="">All Types</option>
        <option value="Toxic Behavior">Toxic Behavior</option>
        <option value="Cheating">Cheating</option>
        <option value="Griefing">Griefing</option>
        <option value="Direct Contact">Direct Contact</option>
      </select>
    </div>
  );
}

export default ReportsFilterBar;
