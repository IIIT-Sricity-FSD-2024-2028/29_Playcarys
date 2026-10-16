/*
 * Concepts used in this component:
 *  - Components, Props (callbacks from the page), State (is the Team dropdown open?),
 *    Events (button clicks, a click anywhere closes the dropdown), Hooks (useState, useEffect)
 *
 * The top bar of the landing page: logo, scroll links, Publisher button, Team dropdown and Sign In.
 * The dropdown opens on click (not hover) and closes when you click anywhere else.
 */
import React, { useState, useEffect } from 'react';

export function LandingNavbar(props) {
  const { onScrollTo, onOpenLogin } = props;
  const [teamOpen, setTeamOpen] = useState(false);

  // A click anywhere else closes the dropdown.
  useEffect(() => {
    function closeDropdown() {
      setTeamOpen(false);
    }
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, []);

  function toggleTeam(e) {
    e.stopPropagation();
    setTeamOpen(!teamOpen);
  }

  function handleTeamItem(type) {
    setTeamOpen(false);
    if (type === 'about') {
      onScrollTo('team');
    } else {
      onOpenLogin(type);
    }
  }

  return (
    <nav className="landing-nav">
      <div className="nav-brand">
        <span className="logo-icon">🎮</span>
        <span className="logo-text">PlayCarys</span>
      </div>
      <div className="landing-nav-links">
        <a onClick={() => onScrollTo('games')}>Games</a>
        <a onClick={() => onScrollTo('publishers')}>Publishers</a>
        <a onClick={() => onScrollTo('team')}>Team</a>
      </div>
      <div className="nav-right">
        <button className="nav-publisher-btn" onClick={() => onOpenLogin('publisher')}>
          👑 Publisher
        </button>
        <div className="nav-team-wrap" id="team-wrap">
          <button
            className={'nav-team-btn' + (teamOpen ? ' open' : '')}
            id="team-btn"
            onClick={toggleTeam}
          >
            🛡️ Team ▾
          </button>
          <div className={'nav-team-dropdown' + (teamOpen ? ' open' : '')} id="team-dropdown">
            <div className="nav-team-item" onClick={() => handleTeamItem('moderator')}>⚠️ Moderator</div>
            <div className="nav-team-item" onClick={() => handleTeamItem('admin')}>🎮 Admin</div>
            <div className="nav-team-item" onClick={() => handleTeamItem('about')}>ℹ️ About Us</div>
          </div>
        </div>
        <button className="nav-signin-btn" onClick={() => onOpenLogin('player')}>
          ➡️ Sign In
        </button>
      </div>
    </nav>
  );
}

export default LandingNavbar;
