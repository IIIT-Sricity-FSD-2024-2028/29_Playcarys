# PlayCarys ER diagrams

Drawn from the tables the back-end actually runs on (`root/back-end/src/data/store.ts`, 43 tables). GitHub draws the Mermaid blocks below automatically.

**How to read them.** Solid line = a real foreign key. Dashed line = a relationship stored as a JSON list of ids in one column, so the database cannot enforce it. `PK` primary key, `FK` foreign key, `UK` unique. Each diagram shows the key columns only; the full column list for every table is in `PlayCarys_DBschema.sql`. Tables from another domain appear with just their primary key so you can see what a link points at.

The whole-database picture is `PlayCarys_ER.png`.

## Accounts

Who people are: roles, users, the two profile types, password resets and linked game accounts.

Tables: `roles`, `users`, `player_profiles`, `publisher_profiles`, `password_resets`, `linked_game_accounts`, `deleted_users`

```mermaid
erDiagram
  roles {
    int role_id PK
    string role_name UK
  }
  users {
    int user_id PK
    string user_name UK
    int role_id FK
    string email UK
    string status
  }
  player_profiles {
    int user_id PK,FK
    int carys_points
    int matches_won
    string active_title
  }
  publisher_profiles {
    int user_id PK,FK
    string studio_name
    int balance_paise
    int lifetime_earned_paise
  }
  password_resets {
    int id PK
    int user_id FK
    datetime expires_at
  }
  linked_game_accounts {
    int link_id PK
    int player_id FK
    string platform
  }
  deleted_users {
    int user_id PK
  }

  roles ||--o{ users : "role_id"
  users ||--o| player_profiles : "user_id"
  users ||--o| publisher_profiles : "user_id"
  users ||--o{ password_resets : "user_id"
  users ||--o{ linked_game_accounts : "player_id"
```

## Games

The catalogue: games, their reviews and saves, achievements and what players have unlocked.

Tables: `games`, `game_reviews`, `game_saves`, `achievements`, `player_achievements`, `deleted_games`, `favorites`, `reviews`

```mermaid
erDiagram
  games {
    int game_id PK
    int game_publisher FK
    string game_name
    string game_approval_status
    int sessions
  }
  game_reviews {
    int review_id PK
    int game_id FK
    int reviewer_id FK
    string decision
  }
  game_saves {
    int user_id PK,FK
    int game_id PK,FK
    int bytes
  }
  achievements {
    int achievement_id PK
    int game_id FK
    string code
    int carys_reward
  }
  player_achievements {
    int user_id PK,FK
    int achievement_id PK,FK
    datetime unlocked_at
  }
  deleted_games {
    int game_id PK
  }
  favorites {
    int user_id PK,FK
    int game_id PK,FK
  }
  reviews {
    int id PK
  }
  users {
    int user_id PK
  }

  users ||--o{ games : "game_publisher"
  users |o--o{ games : "approved_by"
  games ||--o{ game_reviews : "game_id"
  users ||--o{ game_reviews : "reviewer_id"
  users ||--o{ game_saves : "user_id"
  games ||--o{ game_saves : "game_id"
  games |o--o{ achievements : "game_id"
  users |o--o{ achievements : "approved_by"
  users ||--o{ player_achievements : "user_id"
  achievements ||--o{ player_achievements : "achievement_id"
  games |o--o{ player_achievements : "game_id"
  users ||--o{ favorites : "user_id"
  games ||--o{ favorites : "game_id"
```

## Play

Sessions players start, the matches inside them, and each player's result.

Tables: `sessions`, `matches`, `match_results`

```mermaid
erDiagram
  sessions {
    int session_id PK
    int game_id FK
    int created_by FK
    string status
    string mode
  }
  matches {
    string match_id PK
    int game_id FK
    string status
    int created_by FK
  }
  match_results {
    int session_id PK,FK
    int player_id PK,FK
    int score
    int player_rank
  }
  games {
    int game_id PK
  }
  users {
    int user_id PK
  }

  users ||--o{ games : "game_publisher"
  users |o--o{ games : "approved_by"
  games ||--o{ sessions : "game_id"
  users ||--o{ sessions : "created_by"
  users ||--o{ sessions : "hostId"
  games ||--o{ matches : "game_id"
  users |o--o{ matches : "created_by"
  sessions ||--o{ match_results : "session_id"
  users ||--o{ match_results : "player_id"
  users }o..o{ matches : "participants (list)"
```

## Tournaments

Tournaments, their stages and brackets, who entered, and the results.

Tables: `tournaments`, `tournament_games`, `tournament_matches`, `tournament_results`, `player_tournament`, `team_tournament`, `teams`, `deleted_tournaments`

```mermaid
erDiagram
  tournaments {
    int tournament_id PK
    int game_id FK
    int organizer FK
    string tournament_name
    string status
  }
  tournament_games {
    int tournament_game_id PK
    int tournament_id FK
    int game_id FK
    int stage_order
  }
  tournament_matches {
    string match_id PK
    int tournamentId FK
    int round
    int player1 FK
    int player2 FK
    int winnerId FK
  }
  tournament_results {
    int tournament_id PK,FK
    int player_id PK,FK
    int placement
  }
  player_tournament {
    int player_id PK,FK
    int tournament_id PK,FK
  }
  team_tournament {
    int team_id PK,FK
    int tournament_id PK,FK
  }
  teams {
    int team_id PK
    string name
    int captain_id FK
  }
  deleted_tournaments {
    int tournament_id PK
  }
  games {
    int game_id PK
  }
  users {
    int user_id PK
  }
  groups {
    int group_id PK
  }

  users ||--o{ games : "game_publisher"
  users |o--o{ games : "approved_by"
  games ||--o{ tournaments : "game_id"
  users ||--o{ tournaments : "organizer"
  groups |o--o{ tournaments : "group_id"
  tournaments ||--o{ tournament_games : "tournament_id"
  games ||--o{ tournament_games : "game_id"
  tournaments ||--o{ tournament_matches : "tournamentId"
  tournament_games |o--o{ tournament_matches : "tournament_game_id"
  users |o--o{ tournament_matches : "player1"
  users |o--o{ tournament_matches : "player2"
  users |o--o{ tournament_matches : "winnerId"
  tournament_matches |o--o{ tournament_matches : "parentMatchId"
  users |o--o{ tournament_matches : "reportedBy"
  tournaments ||--o{ tournament_results : "tournament_id"
  users ||--o{ tournament_results : "player_id"
  users ||--o{ player_tournament : "player_id"
  tournaments ||--o{ player_tournament : "tournament_id"
  teams ||--o{ team_tournament : "team_id"
  tournaments ||--o{ team_tournament : "tournament_id"
  users ||--o{ teams : "captain_id"
  users ||--o{ groups : "owner_id"
  users }o..o{ teams : "member_ids (list)"
  users }o..o{ groups : "member_ids (list)"
  users }o..o{ groups : "officer_ids (list)"
```

## Social

Friends, friend requests, chat, groups and notifications.

Tables: `friendships`, `friend_requests`, `messages`, `groups`, `group_join_requests`, `notifications`

```mermaid
erDiagram
  friendships {
    int user_a PK,FK
    int user_b PK,FK
    datetime since
    datetime removed_at
  }
  friend_requests {
    int id PK
    int from_user FK
    int to_user FK
    string status
  }
  messages {
    int id PK
    int from_user FK
    int to_user FK
    int tournament_id FK
    int group_id FK
    datetime sent_at
  }
  groups {
    int group_id PK
    int owner_id FK
    string name
    string join_mode
  }
  group_join_requests {
    int id PK
    int group_id FK
    int user_id FK
    string status
  }
  notifications {
    int id PK
    string toRole
    int toUser FK
    int fromUserId FK
    boolean read
    string type
  }
  users {
    int user_id PK
  }
  tournaments {
    int tournament_id PK
  }

  users ||--o{ tournaments : "organizer"
  groups |o--o{ tournaments : "group_id"
  users ||--o{ friendships : "user_a"
  users ||--o{ friendships : "user_b"
  users ||--o{ friend_requests : "from_user"
  users ||--o{ friend_requests : "to_user"
  users ||--o{ messages : "from_user"
  users |o--o{ messages : "to_user"
  tournaments |o--o{ messages : "tournament_id"
  groups |o--o{ messages : "group_id"
  users ||--o{ groups : "owner_id"
  groups ||--o{ group_join_requests : "group_id"
  users ||--o{ group_join_requests : "user_id"
  users |o--o{ notifications : "toUser"
  users |o--o{ notifications : "fromUserId"
  friend_requests |o--o{ notifications : "request_id"
  users }o..o{ groups : "member_ids (list)"
  users }o..o{ groups : "officer_ids (list)"
  users }o..o{ messages : "deleted_for (list)"
  users }o..o{ notifications : "readBy (list)"
```

## Moderation

Reports, the moderator actions taken on them, and bans.

Tables: `reports`, `moderator_actions`, `bans`

```mermaid
erDiagram
  reports {
    int report_id PK
    int reported_by FK
    int reported_user FK
    int sessionId FK
    string status
  }
  moderator_actions {
    int action_id PK
    int moderator_id FK
    int report_id FK
    string action_type
  }
  bans {
    int id PK
    int playerId FK
    int level
    int bannedById FK
    boolean active
  }
  users {
    int user_id PK
  }
  sessions {
    int session_id PK
  }

  users ||--o{ sessions : "created_by"
  users ||--o{ sessions : "hostId"
  users ||--o{ reports : "reported_by"
  users ||--o{ reports : "reported_user"
  sessions |o--o{ reports : "sessionId"
  users ||--o{ moderator_actions : "moderator_id"
  reports ||--o{ moderator_actions : "report_id"
  users ||--o{ bans : "playerId"
  users ||--o{ bans : "bannedById"
```

## Economy

Shop items, subscriptions, the Carys ledger, payments and publisher payouts.

Tables: `cosmetic_items`, `user_cosmetics`, `subscription_plans`, `subscriptions`, `transactions`, `carys_ledger`, `payouts`

```mermaid
erDiagram
  cosmetic_items {
    int id PK
    string name
    string category
    int price_paise
    int price_carys
  }
  user_cosmetics {
    int user_id PK,FK
    int item_id PK,FK
    boolean is_equipped
  }
  subscription_plans {
    string id PK
    string name
    int price_paise
    int stipend_carys
  }
  subscriptions {
    int id PK
    int user_id FK
    string tier FK
    string status
  }
  transactions {
    int id PK
    int user_id FK
    string type
    int amount_paise
    string status
  }
  carys_ledger {
    int entry_id PK
    int user_id FK
    int delta
    int balance_after
  }
  payouts {
    int payout_id PK
    int publisher_id FK
    int net_paise
    string status
    string gateway_ref
  }
  users {
    int user_id PK
  }

  users ||--o{ user_cosmetics : "user_id"
  cosmetic_items ||--o{ user_cosmetics : "item_id"
  users ||--o{ subscriptions : "user_id"
  subscription_plans ||--o{ subscriptions : "tier"
  users ||--o{ transactions : "user_id"
  users ||--o{ carys_ledger : "user_id"
  users ||--o{ payouts : "publisher_id"
```

## Platform and tombstones

`platform_flags` holds one-off platform switches and has no links to other tables. The three `deleted_*` tables are tombstone lists: they exist so a browser that still holds an old copy of the data cannot bring a deleted account, game or tournament back. `favorites` and `reviews` are unused legacy tables.
