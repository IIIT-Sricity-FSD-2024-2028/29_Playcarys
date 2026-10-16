# Dummy data and data sources: audit

Where the project keeps made-up data, and why the front-end and back-end do not read from one place. Nothing was changed to produce this; it is a report. Numbers were counted from the code and the running system.

## Short answer

1. **There are two separate seeds**, one in the back-end (`store.ts`) and one in the front-end (`data/db.js`), and they disagree about real content.
2. **The React app reads data from three places at once**: the back-end API, a copy of the whole database cached in the browser, and values written into the code. About 18 files mix the first two.
3. **The browser writes data back** by sending whole tables to `POST /db-import`, which is why the back-end needs a long list of protections against its own front-end.
4. Along the way: **passwords sit in several places**, and 14 old database copies are committed to git.

## 1. Where the data lives

| # | Place | What it holds | Who reads it |
|---|---|---|---|
| 1 | `back-end/src/data/store.ts` | A **seed** written in code: 12 users, games, tournaments, sessions, reports, bans, notifications. Used only if `live_database.json` does not exist. | The back-end, at boot. |
| 2 | `front-end/live_database.json` | The **running database**. Gitignored, created on first run. The back-end loads it at boot and saves after every change. | The back-end only. |
| 3 | `front-end/data/db.js` (3,458 lines) | A **second seed** (9 games, 11 sessions, 3 reviews ...) plus the old page logic and the browser cache. | Every page, including all of React (`index.html` loads it). |
| 4 | Browser `localStorage` key `playcarys_db_store_v5` | A **cached copy of the whole database**, filled from `GET /db-export` when a page loads. | About 18 React files through `getDatabase()`. |
| 5 | Values in the React code | Fallback ids, fake activity feeds, demo passwords, game id maps (section 3). | The pages that import them. |

Two programs besides the back-end also touch data or ports: `front-end/server.js` (a leftover flat-file database server on port 3000, the same port as the back-end; nothing starts it) and the old HTML pages in `front-end/pages` (41 files) that use `db.js` directly.

## 2. Why front-end and back-end are not "one place"

**a. The two seeds disagree.** Compared row by row: `db.js` has games 7, 8, 9 that the live data does not. The same game or tournament differs in content, for example tournament 1 is "Grandmaster Elite Series" (a chess event, game 7) in `db.js` and "Call of Duty Warzone Cup" (game 1) in the live data; game 1 is pending and disabled in one and approved in the other. Across rows that exist in both, 25 user fields, 22 game fields and 45 tournament fields differ. This is why the live data has sessions pointing at games 7 and 8 that do not exist (see `DB_CHECK.md`).

**b. React reads a browser copy, not the server.** `getDatabase()` returns the cached copy. Counted per file, these mix cache reads and API calls: `superuserService` (49 cache / 36 API), `moderatorService` (29 / 26), `publisherService` (22 / 23), `playerService` (19 / 5), `tournamentService` (17 / 10), `Profile.jsx` (14 / 13), `Tournaments.jsx` (10 / 0), `PublishTournament.jsx` (6 / 0), plus smaller ones. A page that reads the cache shows whatever it held at the last load.

**c. Writes go the other way, in bulk.** `saveDatabase()` sends every changed table to `POST /db-import`. The back-end then has to protect itself from its own front-end: Carys balances, game review fields, delivery fields and (since Task 1) publisher money fields are all copied back from the server on import, because the browser's copy cannot be trusted. Each of those guards exists because of this design.

**d. Offline falls back to made-up data.** `db.js` asks the server for everything with a blocking request at page load. If that fails it silently uses the browser copy, and if there is none, its own seed. The page looks normal while showing data that is not live.

**e. `hydrateFromServer` keeps local extras.** For games and tournaments it keeps rows that exist locally but not on the server (`preservedLocal`), so a row deleted on the server can stay on screen until the cache is cleared. (A reload does replace the cache. A game I planted in the cache was wiped on reload, so this shows up within a session rather than across loads.)

**f. `GET /db-export` needs no sign-in.** Any caller gets every user (without passwords), every notification addressed to anyone, all reports, bans and friend requests. Messages are deliberately left out.

## 3. Dummy and hard-coded data in the code

| Where | What | Risk |
|---|---|---|
| `services/playerService.js` `BUILTIN_GAMES` | Game ids **7 and 8** are hard-coded as Chess and Hill Climbing; ids 16, 18, 19, 25 as bundled games. `js/game-launch.js` repeats the same ids. | **Real bug waiting.** The live data has games 1 to 6, so the **next game created gets id 7** and would be treated as the built-in Chess engine. |
| 14 files | `user id ?? 7` fallbacks (DragonSlayer): `Dashboard`, `Games`, `Leaderboard`, `MatchHistory`, `MyTournaments`, `Notifications`, `Profile`, `Shop`, `Tournaments`, `Community`, `FriendsList`, `NotificationDropdown`, `Avatar3DViewer`, and six places in `playerService` | If a session is missing, pages quietly act as user 7. |
| `services/adminHubService.js` `INITIAL_AUDIT_LOG` | 10 invented audit entries ("Fantasy Quest approved", "Space Warriors enabled", "Puzzle Masters Open completed" ...) about games that do not exist | The admin Hub audit log opens with fake history. Copied from the old page. |
| `services/landingAuthService.js` `DEMO_ACCOUNTS` | **Passwords of 11 real accounts**, including the superuser GodMode, written into front-end code for the "Use →" demo chips | Anyone who opens the page source can read them. |
| `config/developmentIdentity.js` | Committed signed login tokens for the superuser and a moderator (both **expired 2026-10-15**, and tied to one machine's secret) | Dead data, but should not be in git. |
| `services/authService.js` | Dev fallback identities (DragonSlayer, IndieDevStudios, GodMode) that sign you in automatically on `/player`, `/publisher`, `/superuser` paths in dev mode | Hides a missing login instead of showing it. |
| `services/moderatorService.js` | A hard-coded admins list `[SuperAdmin, GodMode]` as a fallback | Same. |
| `FeaturedGame.jsx`, `socialService.js` | The title "Chess Pro" as the default game name | A game that does not exist can appear as a label. |
| `components/admin/hub/SystemSection.jsx` | Card says "Reset Platform Data: reset all mock data to defaults", but the action actually **ends all live matches** | Misleading label. Copied from the old page. |
| `back-end/src/data/store.ts` | Seed users with **plain-text passwords** in source | Credentials in a public-style repo. |

## 4. Dummy data in the running database

The live data (`live_database.json`), as it starts out, is almost entirely demo content: 12 demo accounts (DragonSlayer, NightHawk, PhoenixRise, ShadowMaster, ToxicPlayer, EpicGamesStudio, IndieDevStudios, GodMode, SuperAdmin, SystemAdmin, ModeratorOne, ModeratorTwo), 6 games, 5 tournaments, 11 sessions, 13 match results, 3 reports, 15 notifications, 16 shop items. `player_profiles.matches_won` (for example 234) is invented and does not match the result rows. 26 of the 43 tables are empty.

## 5. In git but should not be

- **14 database snapshot files** in `root/front-end` (`live_database.json.bak-*`, `live_database.pre-restore.json`, about 5 MB). Old copies of the data with up to 79 users and plain-text passwords. The real database file is gitignored; these copies are not. (Deleting them does not remove them from git history.)
- `playcarys_root/`: an older duplicate of the whole app (460 files, about 2.7 MB). Nothing in `root/` uses it.
- Other weight: a 12 MB screen recording in `games/hill_climbing`, duplicate copies of that game (`sanholo`, `mrflaps`, `yvette`, `tigger` ...), and about 70 MB of an uploaded third-party game (`ancient-beast-25`).

## 6. What to do about it (not done)

In order of value for effort:

1. **Fix the game-id collision** (`BUILTIN_GAMES` / `game-launch.js`): look the engine up from the game's own record instead of its id. Small change, prevents a real bug.
2. **Make one seed.** Keep it in the back-end only; delete the `db.js` seed. This removes the disagreement in 2a.
3. **Stop React reading the browser copy.** Move each service from `getDatabase()` to API calls, one service at a time (start with `playerService`, `tournamentService`). Drop `db.js` from React's `index.html` when the last one is done.
4. **Stop the browser writing whole tables.** Replace `POST /db-import` with per-action endpoints (Tasks 1 and 2 already did this for earnings, withdrawals, friends and chat). The import guards can then be deleted.
5. **Close `GET /db-export`**: require sign-in and scope rows to the caller.
6. **Remove demo passwords and tokens from front-end code**, and hash passwords (see `DB_CHECK.md`).
7. Delete the repo clutter in section 5.

Steps 2 to 5 touch the back-end and most of the front-end services, so they are a project of their own rather than a clean-up.
