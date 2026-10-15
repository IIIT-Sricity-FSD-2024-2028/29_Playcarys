/*
 * Concepts used in this file:
 *  - Components (one small component per block of the landing page), Props (the click callbacks),
 *    Lists (the cards are made with .map from small arrays), Events (button clicks),
 *    Callbacks (the page tells each block what to do when a button is pressed)
 *
 * The plain blocks of the landing page, with the same markup and classes as the old index.html:
 * Hero, About, Stats, For Publishers, Call-to-action, Team and Footer.
 */
import React from 'react';

const ABOUT_CARDS = [
  { icon: '🎮', bg: 'rgba(0,212,255,0.15)', title: 'Multiplayer Sessions', text: 'Join competitive multiplayer sessions and play with gamers worldwide.' },
  { icon: '🏆', bg: 'rgba(124,58,237,0.15)', title: 'Tournaments', text: 'Compete in organized tournaments with rankings and prizes.' },
  { icon: '🛡️', bg: 'rgba(16,185,129,0.15)', title: 'Fair Play', text: 'Moderators ensure fair play and maintain a positive gaming environment.' },
  { icon: '⬆️', bg: 'rgba(236,72,153,0.15)', title: 'Publish Games', text: 'Publishers can upload and manage their games on our platform.' }
];

const STATS = [
  { value: '10K+', label: 'Active Players' },
  { value: '50+', label: 'Games' },
  { value: '200+', label: 'Live Sessions' },
  { value: '100K+', label: 'Tournaments' }
];

const PUBLISHER_FEATURES = [
  { icon: '⬆️', title: 'Publish Your Games', text: 'Upload and manage your games with our easy-to-use publisher dashboard.' },
  { icon: '📈', title: 'Reach More Players', text: 'Get your games in front of an engaged community of competitive players.' },
  { icon: '📊', title: 'Track Performance', text: 'Monitor player engagement, sessions, and tournament participation.' }
];

const TEAM = [
  { initials: 'JL', name: 'P. JAGAN LAKSHMANKUMAR' },
  { initials: 'SS', name: 'P. SAILESH SAI' },
  { initials: 'VK', name: 'Y. VENKATESH' },
  { initials: 'PA', name: 'P. AKHIL' },
  { initials: 'BA', name: 'B. AKHIL' }
];

export function HeroSection(props) {
  const { onGetStarted, onLearnMore } = props;
  return (
    <section className="hero">
      <h1>Welcome to PlayCarys</h1>
      <p className="hero-sub">The Ultimate Multiplayer Gaming Platform for Competitive Players</p>
      <div className="hero-btns">
        <button className="hero-btn-primary" onClick={onGetStarted}>🎮 Get Started</button>
        <button className="hero-btn-secondary" onClick={onLearnMore}>Learn More</button>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="section" id="about">
      <h2 className="section-title">About <span style={{ color: 'var(--accent-cyan)' }}>the Platform</span></h2>
      <p className="section-sub">
        PlayCarys is a premier multiplayer gaming platform where players, publishers, and moderators unite.
      </p>
      <div className="about-grid">
        {ABOUT_CARDS.map((card) => (
          <div className="about-card" key={card.title}>
            <div className="about-card-icon" style={{ background: card.bg }}>{card.icon}</div>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatsSection() {
  return (
    <div className="stats-section">
      <div className="stats-row">
        {STATS.map((stat) => (
          <div className="stat-item" key={stat.label}>
            <div className="val">{stat.value}</div>
            <div className="lbl">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublisherSection(props) {
  const { onCollaborate } = props;
  return (
    <div className="publisher-section" id="publishers">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 className="section-title">For Game Publishers</h2>
        <p className="section-sub">
          Are you a game developer or publisher? Showcase your games to thousands of active players on PlayCarys.
        </p>
        <div className="publisher-grid">
          {PUBLISHER_FEATURES.map((feature) => (
            <div className="publisher-feature" key={feature.title}>
              <div className="publisher-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button className="btn btn-purple btn-lg" onClick={onCollaborate}>🤝 Collaborate With Us</button>
        </div>
      </div>
    </div>
  );
}

export function CtaSection(props) {
  const { onJoin, onSignIn } = props;
  return (
    <div className="cta-section">
      <span style={{ fontSize: '3rem' }}>🎮</span>
      <h2 className="section-title" style={{ marginTop: '1rem' }}>Ready to Start Playing?</h2>
      <p>
        Join thousands of players in competitive multiplayer sessions. Choose your role and start your gaming journey today.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="hero-btn-primary" onClick={onJoin}>🎮 Join as Player</button>
        <button className="hero-btn-secondary" onClick={onSignIn}>Sign In</button>
      </div>
    </div>
  );
}

export function TeamSection() {
  return (
    <section className="team-section" id="team">
      <h2 className="section-title">Our Team</h2>
      <div className="team-grid">
        {TEAM.map((member) => (
          <div className="team-card" key={member.initials}>
            <div className="team-avatar">{member.initials}</div>
            <h4>{member.name}</h4>
            <p>Developer</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer>
      <p>PlayCarys Platform © 2026</p>
      <p style={{ marginTop: '0.35rem' }}>Your premier multiplayer gaming destination</p>
    </footer>
  );
}
