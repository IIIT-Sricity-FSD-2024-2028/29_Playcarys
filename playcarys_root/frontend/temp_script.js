

    // ── Team dropdown (click-based, not hover) ─────────────────────────
    function toggleTeamDropdown(e) {
      e.stopPropagation();
      const btn = document.getElementById('team-btn');
      const dropdown = document.getElementById('team-dropdown');
      const isOpen = dropdown.classList.contains('open');
      // Close first if already open
      closeTeamDropdown();
      if (!isOpen) {
        dropdown.classList.add('open');
        btn.classList.add('open');
      }
    }

    function closeTeamDropdown() {
      document.getElementById('team-dropdown').classList.remove('open');
      document.getElementById('team-btn').classList.remove('open');
    }

    function handleTeamItem(type) {
      closeTeamDropdown();
      if (type === 'about') {
        document.getElementById('team').scrollIntoView({ behavior: 'smooth' });
      } else {
        openLoginPanel(type);
      }
    }

    // Close dropdown when clicking anywhere else
    document.addEventListener('click', () => closeTeamDropdown());

    // ── Login Panel ────────────────────────────────────────────────────
    const PANEL_CONFIGS = {
      player: {
        cols: [{
          role: 'player',
          icon: '🎮',
          iconBg: 'rgba(0,212,255,0.15)',
          title: 'Player Sign In',
          inputId: 'p-username',
          passId: 'p-password',
          btnLabel: '🎮 Sign In as Player',
          btnClass: 'btn-primary',
          demos: [
            { label: '🎮 DragonSlayer', user: 'DragonSlayer', pass: 'password123' },
            { label: '🎮 NightHawk', user: 'NightHawk', pass: 'password123' },
            { label: '🎮 ShadowMaster', user: 'ShadowMaster', pass: 'password123' }
          ]
        }],
        extra: `
      <div style="text-align:center;margin-top:1.25rem;font-size:0.82rem;color:var(--text-secondary)">
        Don't have an account?
        <span style="color:var(--accent-cyan);cursor:pointer;font-weight:600" onclick="closeLoginPanel();openRegister()"> Register →</span>
      </div>`
      },
      publisher: {
        cols: [{
          role: 'publisher',
          icon: '👑',
          iconBg: 'rgba(124,58,237,0.2)',
          title: 'Publisher Sign In',
          inputId: 'pub-username',
          passId: 'pub-password',
          inputLabel: 'Username or Phone',
          inputPlaceholder: 'Studio name or +123...',
          btnLabel: '👑 Sign In as Publisher',
          btnClass: 'btn-purple',
          demos: [
            { label: '👑 EpicGamesStudio', user: 'EpicGamesStudio', pass: 'password123' },
            { label: '👑 IndieDevStudios', user: 'IndieDevStudios', pass: 'password123' }
          ]
        }]
      },
      admin: {
        cols: [
          {
            role: 'admin',
            icon: '🎮',
            iconBg: 'rgba(16,185,129,0.15)',
            title: 'Admin Sign In',
            inputId: 'adm-username',
            passId: 'adm-password',
            btnLabel: '🎮 Sign In as Admin',
            btnClass: 'btn-green',
            demos: [
              { label: '🛡️ SuperAdmin', user: 'SuperAdmin', pass: 'password123' },
              { label: '🛡️ SystemAdmin', user: 'SystemAdmin', pass: 'password123' }
            ]
          }
        ]
      },
      moderator: {
        cols: [
          {
            role: 'moderator',
            icon: '⚠️',
            iconBg: 'rgba(245,158,11,0.15)',
            title: 'Moderator Sign In',
            inputId: 'mod-username',
            passId: 'mod-password',
            btnLabel: '⚠️ Sign In as Moderator',
            btnClass: 'btn-yellow',
            demos: [
              { label: '⚠️ ModeratorOne', user: 'ModeratorOne', pass: 'password123' },
              { label: '⚠️ ModeratorTwo', user: 'ModeratorTwo', pass: 'password123' }
            ]
          }
        ]
      }
    };

    function openLoginPanel(type) {
      const panel = document.getElementById('login-panel');
      const inner = document.getElementById('login-panel-inner');

      if (type === 'moderator') {
        // Single moderator column
        panel.style.maxWidth = '420px';
        panel.style.margin = '0 auto';
        inner.style.gridTemplateColumns = '1fr';
        const cfg = PANEL_CONFIGS.moderator.cols[0];
        inner.innerHTML = colHTML(cfg);

      } else if (type === 'admin') {
        // Admin panel with Admin / SuperAdmin tab switcher
        panel.style.maxWidth = '460px';
        panel.style.margin = '0 auto';
        inner.style.gridTemplateColumns = '1fr';
        inner.innerHTML = adminTabHTML('admin');

      } else {
        // Player / Publisher — single column
        panel.style.maxWidth = '420px';
        panel.style.margin = '0 auto';
        inner.style.gridTemplateColumns = '1fr';
        const cfg = PANEL_CONFIGS[type];
        if (!cfg) return;
        inner.innerHTML = colHTML(cfg.cols[0]);
        if (cfg.extra) inner.lastElementChild.insertAdjacentHTML('beforeend', cfg.extra);
      }

      document.getElementById('login-panel-overlay').classList.add('show');
    }

    // Build the admin panel with a tab bar to switch between Admin and Super Admin
    function adminTabHTML(activeTab) {
      const isAdmin = activeTab === 'admin';
      const adminDemos = [
        { label: '🛡️ SuperAdmin', user: 'SuperAdmin', pass: 'password123' },
        { label: '🛡️ SystemAdmin', user: 'SystemAdmin', pass: 'password123' }
      ];
      const superDemos = [
        { label: '⚡ GodMode', user: 'GodMode', pass: 'password123' }
      ];

      const demos = isAdmin ? adminDemos : superDemos;
      const inputId = 'adm-username';
      const passId = 'adm-password';
      const loginRole = isAdmin ? 'admin' : 'superuser';
      const btnLabel = isAdmin ? '🎮 Sign In as Admin' : '⚡ Sign In as Superuser';
      const btnClass = isAdmin ? 'btn-green' : 'btn-primary';

      const demosHTML = demos.map(d =>
        `<div class="demo-row">
       <span class="demo-role">${d.label}</span>
       <span class="demo-fill" onclick="fillPanelDemo('${inputId}','${passId}','${d.user}','${d.pass}')">Use →</span>
     </div>`
      ).join('');

      return `
    <div class="lp-col" style="min-width:0">
      <div class="lp-col-header">
        <div class="lp-col-icon" style="background:rgba(16,185,129,0.15)">🎮</div>
        <div class="lp-col-title">Staff Sign In</div>
      </div>

      <!-- Tab switcher -->
      <div style="display:flex;gap:0.4rem;margin-bottom:1.25rem;background:var(--bg-secondary);border:1px solid var(--border-primary);border-radius:var(--radius-md);padding:0.3rem;">
        <button onclick="switchAdminTab('admin')"
          style="flex:1;padding:0.45rem 0.6rem;border-radius:var(--radius-sm);border:none;cursor:pointer;font-size:0.8rem;font-weight:700;transition:all 0.2s;
                 background:${isAdmin ? 'var(--accent-green)' : 'transparent'};
                 color:${isAdmin ? '#fff' : 'var(--text-secondary)'};">
          🎮 Admin
        </button>
        <button onclick="switchAdminTab('superuser')"
          style="flex:1;padding:0.45rem 0.6rem;border-radius:var(--radius-sm);border:none;cursor:pointer;font-size:0.8rem;font-weight:700;transition:all 0.2s;
                 background:${!isAdmin ? 'var(--gradient-brand)' : 'transparent'};
                 color:${!isAdmin ? '#fff' : 'var(--text-secondary)'};">
          ⚡ Superuser
        </button>
      </div>
      
      <div id="login-error-msg" style="display:none; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); color:var(--accent-red); padding:0.6rem; border-radius:var(--radius-md); font-size:0.82rem; margin-bottom:1rem; text-align:center; font-weight:600;"></div>

      <div class="form-group mb-2">
        <label class="form-label">Username</label>
        <input class="form-input" id="${inputId}" type="text" placeholder="Enter username"/>
        <span class="form-error"></span>
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Password</label>
        <input class="form-input" id="${passId}" type="password" placeholder="Enter password"/>
        <span class="form-error"></span>
      </div>
      <button class="btn ${btnClass} w-full mt-1" onclick="doPanelLogin('${inputId}','${passId}','${loginRole}')">${btnLabel}</button>
      <div class="demo-accounts" style="margin-top:1rem">
        <h4>Demo Accounts</h4>
        ${demosHTML}
      </div>
    </div>`;
    }

    function switchAdminTab(tab) {
      const inner = document.getElementById('login-panel-inner');
      // Preserve typed values across tab switch
      const u = document.getElementById('adm-username')?.value || '';
      const p = document.getElementById('adm-password')?.value || '';
      inner.innerHTML = adminTabHTML(tab);
      document.getElementById('adm-username').value = u;
      document.getElementById('adm-password').value = p;
    }

    function colHTML(col) {
      const demosHTML = col.demos.map(d =>
        `<div class="demo-row">
       <span class="demo-role">${d.label}</span>
       <span class="demo-fill" onclick="fillPanelDemo('${col.inputId}','${col.passId}','${d.user}','${d.pass}')">Use →</span>
     </div>`
      ).join('');

      return `
    <div class="lp-col">
      <div class="lp-col-header">
        <div class="lp-col-icon" style="background:${col.iconBg}">${col.icon}</div>
        <div class="lp-col-title">${col.title}</div>
      </div>
      <div id="login-error-msg" style="display:none; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); color:var(--accent-red); padding:0.6rem; border-radius:var(--radius-md); font-size:0.82rem; margin-bottom:1rem; text-align:center; font-weight:600;"></div>
      <div class="form-group mb-2">
        <label class="form-label">${col.inputLabel || 'Username'}</label>
        <input class="form-input" id="${col.inputId}" type="text" placeholder="${col.inputPlaceholder || 'Enter username'}"/>
        <span class="form-error"></span>
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Password</label>
        <input class="form-input" id="${col.passId}" type="password" placeholder="Enter password"/>
        <span class="form-error"></span>
      </div>
      <button class="btn ${col.btnClass} w-full mt-1" onclick="doPanelLogin('${col.inputId}','${col.passId}','${col.role}')">${col.btnLabel}</button>
      <div class="demo-accounts" style="margin-top:1rem">
        <h4>Demo Accounts</h4>
        ${demosHTML}
      </div>
    </div>`;
    }

    function fillPanelDemo(uId, pId, user, pass) {
      document.getElementById(uId).value = user;
      document.getElementById(pId).value = pass;
    }

    function showPanelError(msg) {
      const el = document.getElementById('login-error-msg');
      if (el) { el.textContent = msg; el.style.display = 'block'; }
      else { Toast.error(msg); }
    }

    function doPanelLogin(uId, pId, expectedRole) {
      const uEl = document.getElementById(uId);
      const pEl = document.getElementById(pId);
      const errEl = document.getElementById('login-error-msg');
      if (errEl) errEl.style.display = 'none';

      if (!uEl.value.trim()) { uEl.focus(); return; }
      const inputVal = uEl.value.trim();
      const cleanInput = inputVal.replace(/[\s-]/g, '').toLowerCase();

      const user = DB.users.find(u => {
        const uNameMatch = u.username && u.username.toLowerCase() === inputVal.toLowerCase();
        const dbPhone = u.phone || u.phone_number;
        const uPhoneMatch = dbPhone && dbPhone.replace(/[\s-]/g, '').toLowerCase() === cleanInput;
        return uNameMatch || (expectedRole === 'publisher' && uPhoneMatch);
      });

      if (!user) { uEl.classList.add('error'); showPanelError('Account not found.'); return; }
      if (user.status === 'banned') { showPanelError('Your account has been banned. You cannot login.'); return; }
      if (user.status === 'suspended' && user.role !== 'player') { showPanelError('Your staff account has been suspended. Contact a superuser.'); return; }

      // Strict role check per panel
      if (user.role !== expectedRole) {
        const labels = { player: 'Player', publisher: 'Publisher', moderator: 'Moderator', admin: 'Admin', superuser: 'Superuser' };
        showPanelError(`This login is for ${labels[expectedRole] || expectedRole} accounts only.`);
        return;
      }

      Auth.login(user);
      Toast.success(`Welcome back, ${user.username}!`);
      closeLoginPanel();
      setTimeout(() => {
        const rolePages = {
          superuser: 'pages/superuser/hub.html',
          admin: 'pages/admin/dashboard.html',
          moderator: 'pages/moderator/dashboard.html',
          publisher: 'pages/publisher/dashboard.html',
          player: 'pages/player/dashboard.html'
        };
        window.location.href = rolePages[user.role] || 'pages/player/dashboard.html';
      }, 800);
    }

    function closeLoginPanel() {
      document.getElementById('login-panel-overlay').classList.remove('show');
    }

    function closePanelOnOverlay(e) {
      if (e.target === document.getElementById('login-panel-overlay')) closeLoginPanel();
    }



    // ── Register (Player) ─────────────────────────────────────────────
    function openRegister() {
      Modal.open('register-modal');
    }

    function doRegister() {
      const uEl = document.getElementById('reg-username');
      const eEl = document.getElementById('reg-email');
      const pEl = document.getElementById('reg-password');
      const cEl = document.getElementById('reg-confirm');

      const valid = Validate.form([
        { el: uEl, rules: [{ type: 'required' }, { type: 'minLen', n: 3, msg: 'Username must be at least 3 characters' }, { type: 'maxLen', n: 20, msg: 'Username max 20 characters' }] },
        { el: eEl, rules: [{ type: 'required' }, { type: 'email' }] },
        { el: pEl, rules: [{ type: 'required' }, { type: 'password' }] },
        { el: cEl, rules: [{ type: 'required' }, { type: 'match', target: pEl, msg: 'Passwords do not match' }] }
      ]);
      if (!valid) return;

      const username = uEl.value.trim();
      const emailVal = eEl.value.trim();

      if (DB.users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
        Validate.field(uEl, [{ type: 'custom', fn: () => false, msg: 'Username already taken' }]); return;
      }
      if (DB.users.find(u => u.email && u.email.toLowerCase() === emailVal.toLowerCase())) {
        Validate.field(eEl, [{ type: 'custom', fn: () => false, msg: 'Email already registered' }]); return;
      }

      const numId = Date.now();
      const newUser = {
        user_id: numId,
        user_name: username,
        role_id: 4,
        id: String(numId),
        username: username,
        email: emailVal,
        password: pEl.value,
        role: 'player',
        avatar: username.slice(0, 2).toUpperCase(),
        status: 'active',
        joinDate: new Date().toISOString().slice(0, 10),
        lastSeen: new Date().toISOString().slice(0, 10)
      };

      if (!DB.player_profiles) DB.player_profiles = [];
      DB.player_profiles.push({
        user_id: numId,
        player_name: username,
        carys_points: 100,
        play_time: 0,
        matches_won: 0,
        player_status: true
      });
      DB.users.push(newUser);
      DB.save();
      Auth.login(newUser);
      Toast.success(`Account created! Welcome, ${username}!`);
      Modal.close('register-modal');
      setTimeout(() => { window.location.href = 'pages/player/dashboard.html'; }, 800);
    }

    // ── Register (Publisher) ──────────────────────────────────────────
    function openPublisherRegister() {
      Modal.open('pub-register-modal');
    }

    function doPublisherRegister() {
      const uEl = document.getElementById('pub-reg-username');
      const eEl = document.getElementById('pub-reg-email');
      const phEl = document.getElementById('pub-reg-phone');
      const pEl = document.getElementById('pub-reg-password');
      const cEl = document.getElementById('pub-reg-confirm');

      const valid = Validate.form([
        { el: uEl, rules: [{ type: 'required' }, { type: 'minLen', n: 3, msg: 'Studio name must be at least 3 characters' }, { type: 'maxLen', n: 30, msg: 'Studio name max 30 characters' }] },
        { el: eEl, rules: [{ type: 'required' }, { type: 'email' }] },
        { el: phEl, rules: [{ type: 'required' }, { type: 'phone' }] },
        { el: pEl, rules: [{ type: 'required' }, { type: 'password' }] },
        { el: cEl, rules: [{ type: 'required' }, { type: 'match', target: pEl, msg: 'Passwords do not match' }] }
      ]);
      if (!valid) return;

      const username = uEl.value.trim();
      const emailVal = eEl.value.trim();
      const ccVal = document.getElementById('pub-reg-cc').value;
      let rawPhone = phEl.value.trim();
      if (rawPhone.startsWith('0')) rawPhone = rawPhone.substring(1); // remove leading zero
      const phoneVal = ccVal + " " + rawPhone;

      if (DB.users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
        Validate.field(uEl, [{ type: 'custom', fn: () => false, msg: 'Studio name already taken' }]); return;
      }
      if (DB.users.find(u => u.email && u.email.toLowerCase() === emailVal.toLowerCase())) {
        Validate.field(eEl, [{ type: 'custom', fn: () => false, msg: 'Email already registered' }]); return;
      }

      const numId = Date.now();
      const newPublisher = {
        user_id: numId,
        user_name: username,
        role_id: 5,
        id: String(numId),
        username: username,
        email: emailVal,
        phone_number: phoneVal,
        password: pEl.value,
        role: 'publisher',
        avatar: username.slice(0, 2).toUpperCase(),
        status: 'active',
        joinDate: new Date().toISOString().slice(0, 10),
        lastSeen: new Date().toISOString().slice(0, 10)
      };

      if (!DB.publisher_profiles) DB.publisher_profiles = [];
      DB.publisher_profiles.push({
        user_id: numId,
        total_games: 0,
        approved_games: 0,
        active_games: 0
      });
      DB.users.push(newPublisher);
      DB.save();
      Auth.login(newPublisher);
      Toast.success(`Studio registered! Welcome, ${username}!`);
      Modal.close('pub-register-modal');
      setTimeout(() => { window.location.href = 'pages/publisher/dashboard.html'; }, 800);
    }

    // ── Explore games ─────────────────────────────────────────────────
    function guestLogin() {
      const guestUser = {
        id: generateId('u'),
        username: 'Guest_' + Math.floor(Math.random() * 10000),
        email: 'guest@playcarys.com',
        role: 'guest',
        avatar: 'G',
        status: 'active',
        rank: 'Unranked',
        carysPoints: 0
      };
      Auth.login(guestUser);
      Toast.success('Playing as ' + guestUser.username + '!');
      setTimeout(() => { window.location.href = 'pages/player/dashboard.html'; }, 800);
    }

    function renderExploreGames() {
      const grid = document.getElementById('trending-grid');
      const trending = DB.games.filter(g => g.status === 'approved').slice(0, 8); // Show up to 8 games
      grid.innerHTML = trending.map((g, i) => `
    <div class="game-card">
      <div class="game-card-img-wrap" onclick="openLoginPanel('player')">
        ${getGameIconHTML(g, i, '100%', 'position:absolute;inset:0')}
        <div class="genre-badge">${g.genre}</div>
      </div>
      <div class="game-card-body">
        <div class="game-card-title">${g.title}</div>
        <p class="game-card-desc">${g.desc}</p>
        <div class="game-card-meta mb-2">
          <span>👥 ${g.players}</span>
          <span style="color:var(--accent-yellow)">⭐ ${g.rating}</span>
        </div>
        <div class="game-card-actions">
           <button class="btn btn-primary btn-sm w-full" onclick="guestLogin()" style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-primary)">👤 Play as Guest</button>
        </div>
      </div>
    </div>`).join('');
    }

    document.addEventListener('DOMContentLoaded', () => { renderExploreGames(); });
  