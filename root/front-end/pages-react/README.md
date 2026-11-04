# PlayCarys front-end (React)

The React version of every PlayCarys screen: per role (player, publisher, moderator, admin, superuser), a shared landing and sign-in page. It replaces the older HTML pages in `../pages` and is the part of the project to run and demo.

- **React 18**, **react-router-dom 6**, **Vite 6**, **chart.js** for charts, **jszip** for game bundle upload

## Run it `root/front-end/pages-react`

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
| Landing | `/` (home landing ,sign in, register) |
| Player | `/player/` `dashboard` `games` `games/:gameId` `tournaments` `tournaments/:tournamentId` `my-tournaments` `leaderboard` `match-history` `notifications` `create-tournament` `community` `shop` `profile` |
| Publisher | `/publisher/` `dashboard` `publish` `publish-tournament` `my-games` `profile` `earnings` |
| Moderator | `/moderator/` `dashboard` `reports` `sessions` `bans` |
| Admin | `/admin/` `dashboard` `users` `approvals` `game-review` `hub` `settings` |
| Superuser | `/superuser/` `dashboard` `hub` `users` `admins` `games` `reports` `settings` |
| Anything else | 404 page |

After signing in, each role goes to its own `…/dashboard` (`HOME_PAGE` in `services/landingAuthService.js`). Logging out returns to `/`.

atabase()` and push changes back with `saveDatabase()`.

Moving every screen to plain API calls is the main open front-end task; the full picture, with file counts, is in `../../../Database/DATA_AUDIT.md`. The newer features (earnings and withdrawals, friends and chat) already use only API calls.

