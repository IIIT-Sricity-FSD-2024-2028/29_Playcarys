# PlayCarys — OMGMP NestJS Backend

Online Multiplayer Game Management Platform backend built with **NestJS**.  
All data is stored in **typed in-memory arrays** (no database required). Seed data mirrors the frontend `db.js` exactly.

---

## Quick Start

```bash
npm install
npm run start:dev
# → http://localhost:3000/api/v1
```

---

## Project Structure

Every workflow is isolated into its own module. Each module follows a strict 5-layer hierarchy:

```
src/
├── data/
│   └── store.ts                   ← Single source of truth: 12 typed arrays + seed data
│
├── auth/                          ← Workflows: Login, Register
│   ├── auth.dto.ts
│   ├── auth.repository.ts         ← array reads/writes only, zero logic
│   ├── auth.service.ts            ← domain rules R-AUTH-1..5 + workflow logic
│   ├── auth.controller.ts         ← HTTP routing only
│   └── auth.module.ts
│
├── roles/                         ← Role lookup (read-only reference data)
├── users/                         ← Workflow: Manage Users & Roles (Admin)
├── player-profile/                ← Workflows: Manage Profile, Match History, Rankings
├── publisher-profile/             ← Publisher stats (computed from games[])
├── game/                          ← Workflows: Publish Game, Set Game State, Approve Listing
├── tournament/                    ← Workflow: Join / Leave Tournament
├── game-session/                  ← Workflows: Play Game, Spectate Game, Quick Play
├── match-result/                  ← Match result storage and leaderboard queries
├── report/                        ← Workflow: Report Player
├── moderator-action/              ← Workflows: Review Reports, Handle Rule Violations
├── notification/                  ← Broadcast and direct message notifications
│
├── app.module.ts                  ← Registers all 11 feature modules
└── main.ts                        ← Bootstrap, global pipes, CORS, prefix /api/v1
```

---

## Data Layer

`src/data/store.ts` contains **12 typed arrays** — one per SQL table from the schema:

| Array | Type | Description |
|---|---|---|
| `roles[]` | `Role` | 5 platform roles |
| `users[]` | `User` | All user accounts |
| `player_profiles[]` | `PlayerProfile` | Stats per player |
| `publisher_profiles[]` | `PublisherProfile` | Stats per publisher |
| `games[]` | `Game` | Game catalogue |
| `tournaments[]` | `Tournament` | Tournament records |
| `sessions[]` | `GameSession` | Active/past game rooms |
| `match_results[]` | `MatchResult` | Per-player session outcomes |
| `reports[]` | `Report` | Player-submitted reports |
| `moderator_actions[]` | `ModeratorAction` | Enforcement records |
| `player_tournament[]` | `PlayerTournament` | Junction: player ↔ tournament |
| `player_session[]` | `PlayerSession` | Junction: player ↔ session |

Repositories are the **only layer** that reads or writes these arrays.  
Services call repositories — never arrays directly.

---

## All Workflows & Domain Rules

### Auth — `/api/v1/auth`
| Rule | Description |
|---|---|
| R-AUTH-1 | Password ≥ 8 characters |
| R-AUTH-2 | Email must be unique |
| R-AUTH-3 | Banned users cannot log in |
| R-AUTH-4 | Self-registration only for player (4) or publisher (5) roles |
| R-AUTH-5 | On register, a matching profile row is auto-created |

```
POST /api/v1/auth/login        { email, password }
POST /api/v1/auth/register     { user_name, email, password, role_id? }
```

---

### Users — `/api/v1/users`  _(Manage Users & Roles workflow — Admin)_
| Rule | Description |
|---|---|
| R-USR-1 | Email must remain unique |
| R-USR-2 | Superuser (role 1) cannot be deleted, demoted, or have status changed |
| R-USR-3 | role_id must be 1–5 |
| R-USR-4 | Role change to player/publisher auto-creates the missing profile |
| R-USR-5 | Deleting a user removes their profile rows |

```
GET    /api/v1/users
GET    /api/v1/users?role_id=4
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
PATCH  /api/v1/users/:id/status    { status: 'active'|'banned'|'suspended' }
PATCH  /api/v1/users/:id/role      { role_id }
DELETE /api/v1/users/:id
```

---

### Player Profiles — `/api/v1/player-profiles`  _(Manage Profile + Rankings)_
| Rule | Description |
|---|---|
| R-PP-1 | player_name must be unique |
| R-PP-2 | carys_points, play_time, matches_won never go below 0 |
| R-PP-3 | Only players with player_status=true can join sessions/tournaments |
| R-PP-4 | Rankings sorted by carys_points descending |

```
GET    /api/v1/player-profiles
GET    /api/v1/player-profiles/leaderboard
GET    /api/v1/player-profiles/:userId
GET    /api/v1/player-profiles/:userId/match-history
PATCH  /api/v1/player-profiles/:userId   { player_name?, player_status? }
```

---

### Publisher Profiles — `/api/v1/publisher-profiles`
```
GET    /api/v1/publisher-profiles
GET    /api/v1/publisher-profiles/:userId
```
Stats (`total_games`, `approved_games`, `active_games`) are computed live from `games[]`.

---

### Games — `/api/v1/games`  _(Publish Game + Set Game State + Approve Listing)_
| Rule | Description |
|---|---|
| R-GAME-1 | game_name must be unique |
| R-GAME-2 | New games start as `pending` + `disabled` |
| R-GAME-3 | Only the owning publisher can update or change state |
| R-GAME-4 | A game can only be `enabled` if already `approved` |
| R-GAME-5 | Approving a game auto-enables it and increments publisher counters |
| R-GAME-6 | Only approved+enabled games appear for players (`?active=true`) |

```
GET    /api/v1/games
GET    /api/v1/games?active=true
GET    /api/v1/games?status=pending
GET    /api/v1/games?publisherId=5
GET    /api/v1/games/:id
POST   /api/v1/games               { game_name, game_type, desc, players, game_publisher, img? }
PATCH  /api/v1/games/:id           { ...fields, publisher_id }
PATCH  /api/v1/games/:id/state     { game_status: 'enabled'|'disabled', publisher_id }
PATCH  /api/v1/games/:id/approve   { game_approval_status: 'approved'|'rejected', note? }
DELETE /api/v1/games/:id
```

---

### Tournaments — `/api/v1/tournaments`  _(Join / Leave Tournament)_
| Rule | Description |
|---|---|
| R-TRN-1 | tournament_name must be unique |
| R-TRN-2 | start_date ≤ end_date; regClose ≤ start_date |
| R-TRN-3 | Registration only for upcoming tournaments before regClose |
| R-TRN-4 | A player cannot register twice for the same tournament |
| R-TRN-5 | Cannot exceed maxParticipants |
| R-TRN-6 | Only players with player_status=true can register |
| R-TRN-7 | Completed tournaments cannot be modified |
| R-TRN-8 | Linked game must be approved and enabled |

```
GET    /api/v1/tournaments
GET    /api/v1/tournaments?status=upcoming
GET    /api/v1/tournaments?gameId=1
GET    /api/v1/tournaments/:id
GET    /api/v1/tournaments/:id/registrations
GET    /api/v1/tournaments/player/:playerId
POST   /api/v1/tournaments
POST   /api/v1/tournaments/:id/register      { player_id }
DELETE /api/v1/tournaments/:id/register/:playerId
PATCH  /api/v1/tournaments/:id
DELETE /api/v1/tournaments/:id
```

---

### Game Sessions — `/api/v1/sessions`  _(Play Game + Spectate Game + Quick Play)_
| Rule | Description |
|---|---|
| R-SES-1 | Sessions only for approved+enabled games |
| R-SES-2 | start_time must be before end_time |
| R-SES-3 | Inactive players (player_status=false) cannot join |
| R-SES-4 | A player cannot join a session they are already in |
| R-SES-5 | Session cannot exceed maxPlayers |
| R-SES-6 | Only the host can end a session |
| R-SES-7 | Ended sessions cannot be joined or changed |
| R-SES-8 | Ending requires at least one result entry |
| R-SES-9 | On end: match_results written, player stats updated, carys_points awarded |
| R-SES-10 | Spectate: returns live sessions the requesting player is NOT already in |
| R-SES-11 | Quick Play: joins busiest available room, or creates a new one |

```
GET    /api/v1/sessions
GET    /api/v1/sessions?gameId=1&status=waiting
GET    /api/v1/sessions/:id
GET    /api/v1/sessions/player/:playerId
GET    /api/v1/sessions/spectate/:playerId?gameId=1
POST   /api/v1/sessions                        { game_id, name, created_by, maxPlayers, mode, start_time, end_time }
POST   /api/v1/sessions/quick-play             { game_id, player_id }
POST   /api/v1/sessions/:id/join               { player_id }
DELETE /api/v1/sessions/:id/leave/:playerId
PATCH  /api/v1/sessions/:id/end                { host_id, results: [{ player_id, score, player_rank }] }
```

---

### Match Results — `/api/v1/match-results`
```
GET    /api/v1/match-results/session/:sessionId
GET    /api/v1/match-results/player/:playerId
GET    /api/v1/match-results/top-scorers?limit=10
```

---

### Reports — `/api/v1/reports`  _(Report Player workflow)_
| Rule | Description |
|---|---|
| R-RPT-1 | A player cannot report themselves |
| R-RPT-2 | Both reporter and reported user must exist |
| R-RPT-3 | Duplicate open reports (same reporter, same target, same type) are rejected |
| R-RPT-4 | reason must not be empty |
| R-RPT-6 | Resolved/rejected reports cannot be re-opened |
| R-RPT-7 | Type must be: Toxic Behavior, Cheating, Griefing, Harassment, Spam, Inappropriate Username, Other |

```
GET    /api/v1/reports
GET    /api/v1/reports?status=pending
GET    /api/v1/reports?reportedUserId=11
GET    /api/v1/reports?reporterId=7
GET    /api/v1/reports/:id
POST   /api/v1/reports                     { reported_by, reported_user, type, reason, session?, sessionId? }
PATCH  /api/v1/reports/:id/status          { status, actionNote? }
```

---

### Moderator Actions — `/api/v1/moderator-actions`  _(Review Reports + Handle Violations)_
| Rule | Description |
|---|---|
| R-MOD-1 | Only roles 1/2/3 (superuser/admin/moderator) can apply actions |
| R-MOD-2 | Ban actions require a ban_duration |
| R-MOD-3 | Cannot ban a player who already has an active ban |
| R-MOD-4 | Banning sets user status='banned' and player_status=false |
| R-MOD-5 | Action on a report auto-marks that report as 'resolved' |
| R-MOD-6 | Cannot act against a user of equal or higher role |
| R-MOD-7 | Violations can be handled without a linked report (direct detection) |

```
GET    /api/v1/moderator-actions
GET    /api/v1/moderator-actions?moderatorId=3
GET    /api/v1/moderator-actions/bans
GET    /api/v1/moderator-actions/bans/active
POST   /api/v1/moderator-actions/act-on-report    { moderator_id, report_id?, action_type, action_reason, target_user_id, ban_duration? }
POST   /api/v1/moderator-actions/handle-violation { moderator_id, target_user_id, action_type, action_reason, violation_type, ban_duration? }
PATCH  /api/v1/moderator-actions/bans/:playerId/lift  { moderator_id }
```

---

### Notifications — `/api/v1/notifications`
| Rule | Description |
|---|---|
| R-NTF-1 | Must target either a role (broadcast) OR a user (direct) — not both |
| R-NTF-2 | toRole must be a valid role name |
| R-NTF-3 | toUser must reference an existing user |
| R-NTF-5 | Users can only mark their own notifications as read |
| R-NTF-6 | Users can only delete their own notifications |
| R-NTF-7 | Replies are appended to the replies array with a timestamp |

```
GET    /api/v1/notifications?userId=7&roleName=player
GET    /api/v1/notifications/unread?userId=7&roleName=player
GET    /api/v1/notifications/unread-count?userId=7&roleName=player
GET    /api/v1/notifications/:id
POST   /api/v1/notifications               { toRole?, toUser?, from, avatar, fromRole, fromUserId, msg }
POST   /api/v1/notifications/:id/reply     { fromUserId, from, msg }
PATCH  /api/v1/notifications/:id/read      { userId, roleName, read: true|false }
PATCH  /api/v1/notifications/mark-all-read { userId, roleName }
DELETE /api/v1/notifications/:id           { userId, roleName }
```

---

## Module Isolation Principle

Each module is fully self-contained:

```
Repository  ←→  arrays in store.ts   (data access only)
     ↑
Service     ←→  Repository           (all domain rules live here)
     ↑
Controller  ←→  Service              (HTTP routing only, no logic)
     ↑
Module      →   wires the three above, declares exports
```

No module imports another module's **Service** directly.  
Cross-cutting data (e.g. session end updating player stats) is handled by writing directly to the shared arrays in `store.ts`, which every service can read via its own repository. This keeps modules decoupled while the arrays stay as the single shared state.
