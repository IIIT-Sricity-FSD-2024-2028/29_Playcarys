<div align="center">

# 🎮 PlayCarys

**An online multiplayer game management platform: play, publish, compete and moderate in one place.**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socketdotio&logoColor=white)

</div>

---

## About

Online multiplayer gaming platforms face increasing complexity in coordinating player participation, managing live game sessions, and enforcing platform-wide rules as multiple games, users, and competitive activities operate simultaneously. When session management, rule enforcement, game availability, and gameplay records are handled in a fragmented manner, it becomes difficult to ensure fair play, consistent governance, and reliable access to historical gameplay data.

A centralized Online Multiplayer Game Management Platform is required to provide unified player access, structured room-based and matchmaking-driven gameplay, and organized tournament participation. The system must support controlled game lifecycle management by publishers, real-time monitoring and enforcement by moderators, and policy-driven governance by administrators. By maintaining persistent session records, enforcing platform policies, and integrating runtime match server services, the platform ensures scalable multiplayer coordination, fair play, and a consistent user experience across games.

**PlayCarys** brings all of that together: a web platform where players find and play games, publishers list and manage them, moderators keep matches fair, and administrators run the whole thing.

## Who it is for

| Role | What they do on PlayCarys |
|---|---|
| 🎮 **Player** | Discover and play games, join tournaments, climb leaderboards, chat with friends, customise an avatar |
| 🛠️ **Publisher** | Upload games, control their availability, track usage, run tournaments and see earnings |
| 🛡️ **Moderator** | Monitor live sessions, review player reports, apply warnings and temporary restrictions |
| ⚙️ **Admin** | Manage users and roles, review and approve games, set platform policy |
| 👑 **Superuser** | Oversee admins and see the platform as a whole |

## Features

**Playing**
- Game library with search and filters, solo and multiplayer modes, live spectating
- Player profiles, rankings, leaderboards and full match history
- Tournaments with brackets, entry fees and prizes, plus teams and groups
- Achievements and titles

**Community**
- Friends, friend requests and private chat
- Notifications and a shared staff inbox
- Player reporting with moderator follow-up

**Publishing**
- Game upload with an automatic security scan before review
- Admin approval workflow and game availability controls
- Usage analytics and publisher earnings with withdrawals

**Economy**
- A platform currency (Carys) earned by playing
- A shop for avatar cosmetics, including 3D items
- Subscriptions and tournament entry payments

**Governance**
- Role-based access for every portal
- Reports, bans and an audit trail
- One signed-in device per account

## Tech stack

| Layer | Technology |
|---|---|
| Front-end | React 18, React Router, Vite, Chart.js |
| Back-end | NestJS (TypeScript), REST API with Swagger documentation |
| Real-time | Socket.IO |
| Data | Typed in-memory store persisted to a JSON file (schema documented for PostgreSQL) |
| Games | Static game bundles launched from the player portal |

## How it fits together

```
   ┌──────────────┐   REST /api/v1    ┌──────────────┐        ┌────────────────┐
   │  React app   │ ────────────────▶ │  NestJS API  │ ─────▶ │  Data store    │
   │  (per-role   │ ◀──────────────── │  + Swagger   │        │  (JSON file)   │
   │   portals)   │   Socket.IO       └──────────────┘        └────────────────┘
   └──────┬───────┘   live events
          │
          ▼
   ┌──────────────┐
   │  Game bundles │
   └──────────────┘
```

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer.

**1. Start the API**

```bash
cd root/back-end
npm install
npm run build
node dist/main
```

**2. Start the web app** (in a second terminal)

```bash
cd root/front-end/pages-react
npm install
npm run dev
```

Then open the address Vite prints (by default <http://localhost:5173>) and sign in from the landing page. The API's interactive documentation is served alongside it at `/api/docs`.

The first run creates its own demo data, so there is nothing else to set up.

## Project structure

```
.
├── root/
│   ├── back-end/          NestJS API
│   ├── front-end/
│   │   ├── pages-react/   React app (all portals)
│   │   └── games/         Playable game bundles
│   └── docs/              Design notes, workflows, revenue model
├── Database/              ER diagrams, SQL schema and data checks
├── SRS.pdf                Software requirements specification
└── Figma designs/         UI prototype
```

## Documentation

| | |
|---|---|
| 📄 Requirements | [`SRS.pdf`](SRS.pdf) |
| 🎨 UI prototype | [`Figma designs`](Figma%20designs/figma_readme.md) |
| 🗂️ Database | [ER diagrams](Database/ER_DIAGRAMS.md), [SQL schema](Database/PlayCarys_DBschema.sql), [data checks](Database/DB_CHECK.md) |
| 🧭 Front-end guide | [`pages-react/README.md`](root/front-end/pages-react/README.md) |
| 🗣️ Domain research | [`DomainExpertInteraction.md`](DomainExpertInteraction.md), [`definitions.yaml`](definitions.yaml) |
| 🎬 Project demo | [Watch the walkthrough](https://drive.google.com/file/d/1PeIOtgBJkNv9t2uU4D0RnnXA8k6fn-hW/view?usp=drivesdk) |

## Status

PlayCarys is a working academic project. Payments are simulated (no real money moves), and the data layer is a file-backed store rather than a production database. The schema in `Database/` is ready for a move to PostgreSQL.

## Team

Built by the 29_Playcarys team as a Full Stack Development course project at IIIT Sri City.

| Contributor | Area |
|---|---|
| saileshsai-p | Player portal, integration, back-end wiring |
| Lakshmankumar P | Publisher portal |
| Venky | Superuser portal |
| Akhil-b | Moderator portal |
| Akhil P | Landing and sign-in, admin portal, staff inbox, publisher earnings, messaging, database documents |
