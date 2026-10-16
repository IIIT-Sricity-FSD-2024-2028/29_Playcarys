# PlayCarys database check

What was checked, what was found, and what is still open.

**Scope.** The 43 tables in `root/back-end/src/data/store.ts`, and the data in `front-end/live_database.json` (the demo data every clone starts from). The back-end stores data as JSON, not SQL, and checks no keys itself, so this check does by script what a SQL database would do: foreign keys, uniqueness, and "does a stored counter still match what it counts".

**Result in one line.** The structure is sound and the live data has no duplicate keys, but the old SQL schema covered only 12 of 43 tables (now replaced), passwords are stored as plain text, and the demo data contains rows that point at things that do not exist.

## Fixed in this change

| Problem | What was done |
|---|---|
| `PlayCarys_DBschema.sql` described 12 tables; the code has 43 | Regenerated from the code: 43 tables, 72 foreign keys. It runs cleanly in a SQL engine. |
| `PlayCarys_ER.png` showed the same 12 tables | Redrawn for all 43 tables, plus one diagram per area in `ER_DIAGRAMS.md` (GitHub draws these itself). |

## Open: needs a decision

### 1. Passwords are stored as plain text (high)
All 12 accounts in `users.password` hold the password itself. The API does not send it out (`GET /users` and `/db-export` strip it), so the exposure is the data file and anything that can read it. Fix: store a salted hash (scrypt) and upgrade each account's hash the next time its owner logs in. This changes login, so it was not done here.

### 2. Rows that point at nothing (demo data)
| Table | Row | Points at | Missing |
|---|---|---|---|
| `sessions` | 4 rows | `game_id` 7 and 8 | no games 7 or 8 (only 1 to 6 exist) |
| `sessions` | 2 to 4 rows | `created_by` / `hostId` 101 to 104 | no such users |
| `match_results` | 2 rows (real-data copy only) | `session_id` 5 | no session 5 |

These are leftover demo rows. They break nothing today because nothing joins them, but a real database would refuse them. Fix: delete them or create the missing games and users.

### 3. Counters that have drifted from what they count
| Stored value | Says | Actual |
|---|---|---|
| `publisher_profiles.total_games` (user 5) | 4 | 3 games |
| `tournaments.participants` (tournament 4) | 8 | 5 `player_tournament` rows |
| `tournaments.participants` (tournament 1, test copy) | 1 | 0 rows |

A counter and the rows it counts can disagree because both are written separately. Fix: derive the number from the rows when it is read, as the earnings page now does for royalty.

### 4. Two tables that mean the same thing
`sessions` and `matches` both describe one play session. Results (`match_results`) attach to `sessions`; `matches` has no results. Merging them removes a place where the two can disagree.

### 5. Relationships hidden inside one column
Six links are stored as a JSON list of ids, so the database cannot check them or index them: `teams.member_ids`, `groups.member_ids`, `groups.officer_ids`, `matches.participants`, `messages.deleted_for`, `notifications.readBy`. They are drawn dashed in the diagrams. Each should become its own join table. `notifications.toRole` also links to `roles` by name rather than id.

### 6. Copies of other tables' data
These store a copy that can go stale: `sessions.game` / `host` / `hostId`, `matches.game`, `bans.playerName` / `bannedBy`, `game_reviews.reviewer_name`, `reports.session`, `notifications.from`. No mismatches exist today. If a username changes, they will.

### 7. Smaller things
- **Mixed naming.** Some columns are `snake_case`, some `camelCase` (`joinDate`, `lastSeen`, `maxParticipants`, `regClose`, `hostId`, `playerId`, `bannedById`, `tournamentId`, `winnerId`, `fromUserId`, `toUser`). Pick one.
- **A text value in a number column.** `tournament_matches.player1`, `player2` and `winnerId` hold the word `BYE` for a bye, so they cannot be real foreign keys. Use NULL.
- **Undeclared columns.** `match_results.carys_earned` and `xp_gained` exist in the data but not in the back-end's `MatchResult` type.
- **Stray field.** Three `reports` rows carry `_rGetters: true`, a flag the old front-end helper wrote into stored data by mistake. Safe to delete.
- **Unused tables.** `favorites` and `reviews` are never read or written (`game_reviews` replaced `reviews`).
- **Display text as data.** `notifications.time` holds text like "Just now" instead of a timestamp.
- **Untyped references.** `transactions` and `carys_ledger` use `ref_type` + `ref_id`, so one column points at different tables. Fine for a ledger, but the database cannot check it.
- **Demo counters.** `player_profiles.matches_won` (for example 234) is far above the number of result rows. It is seed data, not something computed.

## Not a problem
- No duplicate ids, usernames or emails; no duplicate friendships or tournament entries; every friendship is stored once with `user_a < user_b`.
- Every `users.role_id`, `games.game_publisher`, `tournaments.game_id` and `tournaments.organizer` points at a real row.
- Every player has a player profile and every publisher a publisher profile, and no profile sits on the wrong role.
- 26 of the 43 tables hold no rows in the demo data (messages, payouts, transactions, groups and so on). They work; the demo data just does not exercise them.

## How it was checked
A read-only script walked every foreign key, uniqueness rule and counter, run on both the test copy and the real data copy. The regenerated SQL was then executed in a SQL engine (43 tables created, 72 foreign keys, all references resolve). The model behind the diagrams was compared column by column against `store.ts` and the data file: no differences.
