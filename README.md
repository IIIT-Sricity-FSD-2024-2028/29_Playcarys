# 29_Playcarys — PlayCarys

Online multiplayer gaming platforms face increasing complexity in coordinating player participation, managing live game sessions, and enforcing platform-wide rules as multiple games, users, and competitive activities operate simultaneously. When session management, rule enforcement, game availability, and gameplay records are handled in a fragmented manner, it becomes difficult to ensure fair play, consistent governance, and reliable access to historical gameplay data.

A centralized Online Multiplayer Game Management Platform is required to provide unified player access, structured room-based and matchmaking-driven gameplay, and organized tournament participation. The system must support controlled game lifecycle management by publishers, real-time monitoring and enforcement by moderators, and policy-driven governance by administrators. By maintaining persistent session records, enforcing platform policies, and integrating runtime match server services, the platform ensures scalable multiplayer coordination, fair play, and a consistent user experience across games.

**PlayCarys** is that platform: a React front-end, a NestJS back-end, and a set of playable games, with one portal for each kind of user.

## Actors

| Actor | Role |
|------|------------------------------------|
| Player | the primary user |
| Game publisher | game provider, manages the game |
| Moderator | handles player reports, monitors live sessions and enforces rules |
| Admin | platform administrator, manages the platform |
| Superuser | top-level account: manages admins, sees the platform's whole picture (added during development) |

## Features provided to the actors

### Player
- Game selection
- Game participation
- Spectate game
- Profile management
- Ranking system
- Past game sessions
- Report player
- Tournament
- Also built: friends and private chat, groups and teams, achievements, a shop for avatar cosmetics paid in Carys (the in-platform currency) or INR, subscriptions

### Game publisher
- Game listing
- Game availability lifecycle
- Game usage monitoring
- Session configuration
- Game updates
- Also built: game upload with an automatic security scan before review, publisher tournaments, an earnings page with self-service withdrawals

### Moderators
- Live session monitoring
- Enforce rules & actions
- Manage temporary restriction
- Report handling

### Admin
- Player and role management
- Publisher management
- Platform policy management
- Also built: game review and approval, a control hub with live matches and a staff inbox

## How it fits together

```
 Browser (React app, port 5173)  --/api/v1-->  NestJS back-end (port 3000)  -->  live_database.json
        |                                              |
        +-- /socket.io (live matches, device login) ---+
```

- The **back-end** (`root/back-end`) is a NestJS app with 21 controllers and about 166 endpoints under `/api/v1`. It keeps its data in typed in-memory arrays (43 tables) and saves them to a JSON file after every change.
- The **front-end** (`root/front-end/pages-react`) is a React 18 + Vite app with a portal per role. See its [own README](root/front-end/pages-react/README.md).
- The **games** (`root/front-end/games`) are served as static bundles and launched from the player pages.

## Getting started

You need **Node.js 20 or newer** (developed on Node 24) and npm.

### 1. Back-end

```bash
cd root/back-end
npm install
npm run build
node dist/main
```

It listens on `http://localhost:3000`. For development with automatic restart use `npm run start:dev` instead of the last two steps.

- API root: `http://localhost:3000/api/v1`
- Interactive API docs (Swagger): `http://localhost:3000/api/docs`

On the first run there is no data file, so the back-end starts from its built-in demo data and creates `root/front-end/live_database.json` (ignored by git). Delete that file to go back to the demo data.

### 2. Front-end

In a second terminal:

```bash
cd root/front-end/pages-react
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server forwards `/api` and `/socket.io` to the back-end on port 3000.

### Other ways to run

`root/run.bat` (Windows) starts the back-end and a small static server on port 8080 that serves the **older HTML pages**, then opens a public link through localtunnel. It does not serve the React app; use the steps above for that.

### Signing in

The landing page (`/`) has one sign-in panel per role, each with "Use →" shortcuts that fill in most of the seeded demo accounts:

| Role | Demo accounts |
|---|---|
| Superuser | GodMode |
| Admin | SuperAdmin, SystemAdmin |
| Moderator | ModeratorOne, ModeratorTwo |
| Publisher | EpicGamesStudio, IndieDevStudios |
| Player | DragonSlayer, NightHawk, PhoenixRise, ShadowMaster, ToxicPlayer |

The seeded passwords are demo data and are listed in the code (see *Known limitations*).

### Settings (environment variables, all optional)

| Variable | Used for |
|---|---|
| `PORT` | Back-end port (default 3000) |
| `AUTH_SECRET` | Key that signs login tokens. If unset, a random one is created once and kept in `root/back-end/.auth-secret` |
| `DB_FILE` | Use a different data file, for example a scratch copy for testing |
| `GAMES_DIR` | Where uploaded game bundles are stored |
| `CORS_ALLOWLIST` | Extra browser origins allowed to call the API |
| `PAYMENT_SIM_DELAY_MS` | How long the simulated payment gateway "takes" (default 3500) |
| `VITE_API_BASE_URL` | Point the React app at another back-end |

## Repository layout

```
.
├── README.md                       this file
├── SRS.pdf                         software requirements specification
├── DomainExpertInteraction.md      summary of the domain-expert interview
├── definitions.yaml                domain terms from that interview
├── Figma designs/                  link to the Figma prototype
├── Database/                       ER diagrams, SQL schema, data checks (see below)
├── playcarys_root/                 an older copy of the app, kept for reference
└── root/
    ├── back-end/                   NestJS API (src/<module>/ per feature, src/data/store.ts = the data)
    ├── front-end/
    │   ├── pages-react/            the React app (current front-end)
    │   ├── pages/, js/, data/      the older HTML pages and their scripts
    │   ├── games/                  playable game bundles
    │   └── live_database.json      the running data (created on first run, not in git)
    ├── docs/                       design notes: avatar specs, revenue model, workflows, scalability
    ├── tools/                      scripts used to prepare 3D avatar assets
    └── run.bat                     one-click launcher for the older stack
```

## Data and database documents (`Database/`)

| File | What it is |
|---|---|
| `PlayCarys_ER.png` / `.svg` | ER diagram of all 43 tables |
| `ER_DIAGRAMS.md` | One diagram per area (accounts, games, play, tournaments, social, moderation, economy) |
| `PlayCarys_DBschema.sql` | PostgreSQL schema for the same 43 tables |
| `DB_CHECK.md` | Integrity check of the data and the design, with what is still open |
| `DATA_AUDIT.md` | Where demo data lives and why the front-end and back-end do not read from one place |

## Project documents

- **Requirements:** `SRS.pdf`
- **Domain expert interview:** `DomainExpertInteraction.md`, `definitions.yaml`
- **Design prototype:** `Figma designs/figma_readme.md`
- **Workflows, revenue model, scalability:** `root/docs/`
- **Project demonstration video** (ER, Jira management, workflows, back-end walkthrough, DTOs and Swagger): <https://drive.google.com/file/d/1PeIOtgBJkNv9t2uU4D0RnnXA8k6fn-hW/view?usp=drivesdk>

## Team

| Area | Work (from the commit history) |
|---|---|
| Player pages, integration, back-end wiring | saileshsai-p |
| Publisher module | Lakshmankumar P |
| Superuser module | Venky |
| Moderator module | Akhil-b |
| Landing and login, admin pages, staff inbox, publisher earnings and withdrawals, player messaging and menu, database documents | Akhil P |

## Known limitations

These are open on purpose or not yet done; the linked files have the detail.

- **Passwords are stored as plain text** in the data file and in the seed, and the demo passwords are also in the landing page code. The API never sends them out. Hashing them is the first thing to fix (`Database/DB_CHECK.md`).
- **The front-end still reads a browser copy of the database** in many places and writes whole tables back through `POST /db-import`; the back-end has guards for the sensitive fields. Moving each screen to plain API calls is planned (`Database/DATA_AUDIT.md`).
- **Payments are simulated.** Withdrawals, shop purchases and subscriptions go through a gateway interface with a simulated implementation; no real money moves. A real provider is one class and one line to swap (`root/back-end/src/economy/payment.gateway.ts`).
- **No automated tests yet.** Features were checked by hand and with scripts against a running back-end.
- **The older HTML pages are still in the repository** next to the React app, and `root/back-end/README.md` describes an earlier, smaller version of the back-end (12 tables).
