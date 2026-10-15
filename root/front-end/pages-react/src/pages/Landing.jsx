/*
 * Concepts used in this component:
 *  - Components (navbar, sections, login panel, sign-up boxes), Props (callbacks and data passed down),
 *    State (which panel/box is open, the games list, the toast list), Events (button clicks),
 *    Lists (the toasts, the game cards inside ExploreGames), Hooks (useState, useEffect, useContext),
 *    Context (AuthContext.login), Router (useNavigate to the role's dashboard, useSearchParams for
 *    ?action=register), Callbacks (children tell this page when someone signed in), Prop drilling
 *    (showToast goes down to the login panel)
 *
 * The React version of the old index.html: the public landing page and the login. It is the
 * home of the site ("/" and "/index.html"). After a sign-in it sends each role to its own
 * dashboard: React pages for admin, publisher and player; the old .html pages for moderator and
 * superuser (they have no React pages yet).
 */
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import LandingNavbar from '../components/landing/LandingNavbar';
import {
  HeroSection,
  AboutSection,
  StatsSection,
  PublisherSection,
  CtaSection,
  TeamSection,
  LandingFooter
} from '../components/landing/LandingSections';
import ExploreGames from '../components/landing/ExploreGames';
import LoginPanel from '../components/landing/LoginPanel';
import { PlayerRegisterModal, PublisherRegisterModal } from '../components/landing/RegisterModals';
import LandingToasts from '../components/landing/LandingToasts';
import { waitForDb } from '../services/adminService';
import { homeFor, buildSession, makeGuestUser } from '../services/landingAuthService';
// The shared stylesheet comes first, then the landing CSS, as in the old index.html
// (<link> first, page <style> after), so the landing rules win ties like before.
import '../styles/global.css';
import '../styles/landing/landing.css';

export function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useContext(AuthContext);

  // panel.type: which sign-in panel (player / publisher / moderator / admin); panel.key makes a
  // freshly opened panel start with empty fields.
  const [panel, setPanel] = useState({ type: null, open: false, key: 0 });
  const [showRegister, setShowRegister] = useState(false);
  const [showPubRegister, setShowPubRegister] = useState(false);
  const [games, setGames] = useState([]);
  const [toasts, setToasts] = useState([]);
  const redirectTimer = useRef(null);

  // Toast: shows for 3.5s, fades out for 0.35s, then goes (same timings as the old Toast).
  function showToast(type, msg) {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id: id, type: type, msg: msg, leaving: false }]);
    setTimeout(() => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    }, 3500);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3850);
  }

  function openLoginPanel(type) {
    setPanel((p) => ({ type: type, open: true, key: p.key + 1 }));
  }

  function closeLoginPanel() {
    setPanel((p) => ({ ...p, open: false }));
  }

  function openRegister() {
    setShowRegister(true);
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // After a sign-in or sign-up: wait 0.8s (so the welcome toast is seen), then open the role's home.
  function goHome(role) {
    const path = homeFor(role);
    redirectTimer.current = setTimeout(() => {
      if (path.startsWith('/pages/')) {
        window.location.href = path;   // old .html page (no React version yet)
      } else {
        navigate(path);
      }
    }, 800);
  }

  function handleSignedIn(role) {
    closeLoginPanel();
    goHome(role);
  }

  function handlePlayerRegistered(user, sessionToken) {
    login(buildSession(user, sessionToken), null);
    showToast('success', `Account created! Welcome, ${user.username}!`);
    setShowRegister(false);
    goHome('player');
  }

  function handlePublisherRegistered(user, sessionToken) {
    login(buildSession(user, sessionToken), null);
    showToast('success', `Studio registered! Welcome, ${user.username}!`);
    setShowPubRegister(false);
    goHome('publisher');
  }

  function handleGuest() {
    const guest = makeGuestUser();
    login(buildSession(guest, null), null);
    showToast('success', 'Playing as ' + guest.username + '!');
    goHome('guest');
  }

  // On load: tab title, the games to show, a "you were signed out" message, and the
  // ?action=register / ?action=login links used by the guest navbar.
  useEffect(() => {
    document.title = 'PlayCarys — The Ultimate Multiplayer Gaming Platform';

    waitForDb().then((ok) => {
      if (ok) {
        setGames(DB.games.filter((g) => g.status === 'approved').slice(0, 8));
      }
    });

    let reason = null;
    try {
      reason = sessionStorage.getItem('pc_logout_reason');
      if (reason) sessionStorage.removeItem('pc_logout_reason');
    } catch (e) {
      // storage blocked: no message
    }
    const timers = [];
    if (reason) {
      timers.push(setTimeout(() => showToast('warning', reason), 300));
    }
    const action = searchParams.get('action');
    if (action === 'register') {
      timers.push(setTimeout(() => setShowRegister(true), 400));
    } else if (action === 'login') {
      timers.push(setTimeout(() => openLoginPanel('player'), 400));
    }

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(redirectTimer.current);
    };
  }, []);

  return (
    <div className="landing-root">
      <LandingNavbar onScrollTo={scrollToSection} onOpenLogin={openLoginPanel} />

      <HeroSection onGetStarted={openRegister} onLearnMore={() => scrollToSection('about')} />
      <AboutSection />
      <StatsSection />
      <ExploreGames games={games} onSignIn={() => openLoginPanel('player')} onGuest={handleGuest} />
      <PublisherSection onCollaborate={() => setShowPubRegister(true)} />
      <CtaSection onJoin={openRegister} onSignIn={() => openLoginPanel('player')} />
      <TeamSection />
      <LandingFooter />

      {panel.type && (
        <LoginPanel
          key={panel.key}
          type={panel.type}
          open={panel.open}
          onClose={closeLoginPanel}
          onSignedIn={handleSignedIn}
          onOpenRegister={() => { closeLoginPanel(); openRegister(); }}
          showToast={showToast}
        />
      )}

      <PlayerRegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onRegistered={handlePlayerRegistered}
      />
      <PublisherRegisterModal
        open={showPubRegister}
        onClose={() => setShowPubRegister(false)}
        onRegistered={handlePublisherRegistered}
      />

      <LandingToasts toasts={toasts} />
    </div>
  );
}

export default Landing;
