# PlayCarys front-end (React)

The React version of every PlayCarys screen: one portal per role (player, publisher, moderator, admin, superuser), a shared landing and sign-in page, and a staff inbox. It replaces the older HTML pages in `../pages` and is the part of the project to run and demo.

- **React 18**, **react-router-dom 6**, **Vite 6**, **chart.js** for charts, **jszip** for game bundle upload
- About 44,000 lines: 42 pages, 197 components, 18 services, 3 contexts, 6 layouts

## Run it

The back-end must be running first (`root/back-end`, port 3000; see the main README).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the build locally
```

The dev server forwards `/api` and `/socket.io` to `http://localhost:3000`. To use a back-end somewhere else, set `VITE_API_BASE_URL`, or open any page once with `?server=<address>` (it is remembered in the browser).

Vite also serves the older static folders (`/pages`, `/images`, `/assets`, `/css`, `/data`, `/js`, `/games`, `/vendor`) from `../`, because the games, images and `data/db.js` still live there. `index.html` loads `/data/db.js`; see *How data reaches a page*.

> `dist/` is committed build output. Nothing in the repository serves it; use `npm run dev`.

## Folder map

```
src/
├── main.jsx                 starts the app
├── routes/AppRoutes.jsx     every URL in the app (the route table below)
├── layouts/                 one per role: navbar + page frame (Player, Publisher, Moderator, Admin, Superuser, Staff)
├── pages/<role>/            one file per screen
├── components/<role>/...    the pieces each screen is made of; components/common = shared (modals, toasts, loading)
├── services/                everything that talks to data: api.js plus one service per area
├── context/                 AuthContext (who is signed in), ChatContext (friends, requests, unread, chat window), AdminContext
├── styles/<role>/           CSS for each area; styles/global.css is shared
├── config/                  development sign-in identities (see Sign-in)
└── utils/money.js           rupee / Carys formatting
```

## Routes

| Area | Paths |
|---|---|
| Landing | `/`, `/index.html` (sign in, register, forgot password) |
| Player | `/player/` `dashboard` `games` `games/:gameId` `tournaments` `tournaments/:tournamentId` `my-tournaments` `leaderboard` `match-history` `notifications` `create-tournament` `community` `shop` `profile` |
| Publisher | `/publisher/` `dashboard` `publish` `publish-tournament` `my-games` `profile` `earnings` |
| Moderator | `/moderator/` `dashboard` `reports` `sessions` `bans` |
| Admin | `/admin/` `dashboard` `users` `approvals` `game-review` `hub` `settings` |
| Superuser | `/superuser/` `dashboard` `hub` `users` `admins` `games` `reports` `settings` |
| Staff | `/staff/inbox` (shared by admin, superuser, moderator and publisher) |
| Anything else | 404 page |

After signing in, each role goes to its own `…/dashboard` (`HOME_PAGE` in `services/landingAuthService.js`). Logging out returns to `/`.

## Sign-in and sessions

- The landing page signs in with `POST /api/v1/auth/login`. The server answers with a signed **token** (kept as `playcarys_api_token`) and the account's **session token**; the signed-in user is kept as `playcarys_session`.
- `services/api.js` sends the token as `Authorization: Bearer …` and the role as a `role` header on every call. Anything that moves money, or reads or writes private data (withdrawals, friends, chat), needs the signed token; the `role` header alone is refused.
- One account can be signed in on one device at a time. A second sign-in gets a "signed in elsewhere" prompt, and the first device is told to approve or refuse (`login` conflict handling in `landingAuthService.js`).
- **Development fallback:** with no login, the player, publisher, moderator and superuser pages sign you in as a built-in demo identity (`services/authService.js`, `config/developmentIdentity.js`). That is enough to look at pages but not to withdraw money or chat; sign in through the landing page for those.

## How data reaches a page

Each area has a service in `src/services/` (`playerService`, `publisherService`, `moderatorService`, `superuserService`, `tournamentService`, `socialService`, `notificationService`, `staffInboxService`, and the `admin*` set). They talk to the back-end through `api.js`.

Today a page gets data in two ways, and many services use both:

1. **API calls** to `/api/v1/...` (the target way).
2. **A browser copy of the database.** `/data/db.js` loads the whole database from `GET /db-export` when the page opens and keeps it in `localStorage` (`playcarys_db_store_v5`); services read it with `getDatabase()` and push changes back with `saveDatabase()`.

Moving every screen to plain API calls is the main open front-end task; the full picture, with file counts, is in `../../../Database/DATA_AUDIT.md`. The newer features (earnings and withdrawals, friends and chat) already use only API calls.

## What changed in the front-end

### The move to React
The older HTML pages (`../pages`, scripts in `../js`) were rebuilt as React screens, one module per role: player and integration by saileshsai-p, publisher by Lakshmankumar P, superuser by Venky, moderator by Akhil-b, and landing, admin and staff inbox by Akhil P. The old pages are still in the repository next to this app.

### Landing page and sign-in (Akhil P)
- `/` and `/index.html` now show the React landing page (`pages/Landing.jsx`, `components/landing/*`), not the old `index.html`. The old file is no longer served by Vite.
- Sign-in, registration (player and publisher), forgot-password and the signed-in-elsewhere prompt moved into `services/landingAuthService.js`.
- Every role's logout goes back to `/` (a router navigation, with no page reload).

### Admin pages (Akhil P)
Six screens that look and behave like the old pages: dashboard, users, approvals, game review, control hub, settings. Files: `pages/admin`, `components/admin`, `context/AdminContext.jsx`, `services/admin*.js`, `styles/admin`. The `.html` links were removed from the admin navbar so it only links to React routes.

### Staff inbox (Akhil P)
New route `/staff/inbox` (`pages/staff/Inbox.jsx`, `components/staff`, `services/staffInboxService.js`): the message inbox shared by admin, superuser, moderator and publisher.

### Publisher earnings and withdrawals (Akhil P)
- `pages/publisher/Earnings.jsx` now shows money in three places that add up to the lifetime total: **available**, **in transit** and **paid out**.
- A **Withdraw** button appears once the available amount reaches the minimum (₹500). Below it, a progress bar shows how far there is to go.
- The withdraw dialog (`components/publisher/earnings/WithdrawModal.jsx`) takes a UPI id or a bank account, shows a processing screen, then a success or a "declined, nothing taken" screen. If the page is reloaded mid-transfer, a banner with "Track it" reopens the processing screen.
- The dashboard cards (`PublisherStats`, `PublisherEarningsSummary`) show the same numbers.

### Player messaging and the menu (Akhil P)
- **Friend requests really work.** Accept and Decline on the Notifications page now answer the request on the server; before they only marked the notification read.
- **`context/ChatContext.jsx`** is now the one place that knows the player's friends, pending requests and unread messages, all from the server and refreshed every 8 seconds. The navbar, dashboard friends list and chat window read from it.
- **Chat window:** switching friends no longer shows the previous friend's messages, a message that fails to send says so and gives the text back, and replies on notifications are saved.
- **The hamburger menu** (`components/player/common/PlayerNavbar.jsx`, `styles/player/drawer.css`) is a drawer with your profile, all ten player pages, friend requests you can answer on the spot, and your friends sorted by unread and recent chat, with a count badge on the ☰ icon. Escape closes it. The Quick Access "Chat" button opens it instead of opening a chat with an arbitrary friend.

## Conventions used in the files above

- Files by Akhil P start with a short **"Concepts used"** comment listing the React ideas in that file.
- CSS is split per area (`styles/<area>/`). Styles copied from the old pages are scoped with a wrapper so they cannot leak into other screens.
- Shared behaviour goes in a service or a context, not in a page.

## Known gaps

- Many screens still read the browser copy of the database instead of calling the API (see above).
- Some fallbacks use made-up values: player id 7 when no one is signed in, a hard-coded demo activity feed in the admin hub, demo passwords on the landing page, and fixed game ids 7 and 8 for the built-in games. The list, with files, is in `Database/DATA_AUDIT.md`.
- There are no automated tests; screens were checked by hand against a running back-end.
