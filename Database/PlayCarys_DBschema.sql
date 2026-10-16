-- ============================================================
--  PlayCarys database schema (PostgreSQL)
--
--  Regenerated from the data model the back-end actually runs on:
--  root/back-end/src/data/store.ts  (43 tables, one per exported array)
--
--  The back-end persists to JSON (front-end/live_database.json), not SQL, and
--  enforces none of these keys or checks itself. This file is the schema the
--  data is designed against: use it to create a real database, and the ER
--  diagram (PlayCarys_ER.png / ER_DIAGRAMS.md) is drawn from the same model.
--
--  Column names are kept EXACTLY as the code uses them, including the mixed
--  camelCase / snake_case (quoted where PostgreSQL needs it). Cleaning those
--  up is listed in DB_CHECK.md.
--
--  Money is stored as integer paise; Carys are whole numbers.
--  "-- notes" beside a column mark denormalised copies, counters and other
--  places where the stored data can drift from its source.
-- ============================================================

-- ───────── Accounts ─────────

CREATE TABLE roles (
  role_id INT PRIMARY KEY,
  role_name VARCHAR(30) NOT NULL UNIQUE  -- superuser | admin | moderator | player | publisher
);

CREATE TABLE users (
  user_id INT PRIMARY KEY,
  user_name VARCHAR(50) NOT NULL UNIQUE,
  role_id INT NOT NULL REFERENCES roles(role_id),
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,  -- stored in PLAIN TEXT today - see DB_CHECK.md
  avatar VARCHAR(16) NOT NULL,
  status VARCHAR(13) NOT NULL CHECK (status IN ('active', 'banned', 'suspended')),
  "joinDate" DATE NOT NULL,
  "lastSeen" TIMESTAMP NOT NULL,
  active_session_token VARCHAR(64),  -- one-account-one-session lock
  active_session_at TIMESTAMP
);

CREATE TABLE player_profiles (
  user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  carys_points INT NOT NULL,  -- cached balance; the carys_ledger is the record
  play_time INT NOT NULL,
  matches_won INT NOT NULL,
  player_status BOOLEAN NOT NULL,
  active_title VARCHAR(60)
);

CREATE TABLE publisher_profiles (
  user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  studio_name VARCHAR(80),
  founded VARCHAR(10),
  total_games INT NOT NULL,
  approved_games INT NOT NULL,
  active_games INT NOT NULL,
  revenue_pcp INT,  -- engagement counter, not money
  balance_paise BIGINT,  -- money in transit
  lifetime_earned_paise BIGINT,
  settled_pcp INT,  -- royalty already paid out (watermark)
  settled_rake_paise BIGINT  -- rake already paid out (watermark)
);

CREATE TABLE password_resets (
  id INT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id),
  code_hash VARCHAR(64) NOT NULL,  -- sha256 of the emailed code
  requested_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

CREATE TABLE linked_game_accounts (
  link_id INT PRIMARY KEY,
  player_id INT NOT NULL REFERENCES users(user_id),
  platform VARCHAR(30) NOT NULL,
  platform_label VARCHAR(60) NOT NULL,
  in_game_name VARCHAR(60) NOT NULL,
  linked_at TIMESTAMP NOT NULL
);

CREATE TABLE deleted_users (
  user_id INT PRIMARY KEY  -- tombstone: stops a stale browser re-creating a deleted account
);

-- ───────── Games ─────────

CREATE TABLE games (
  game_id INT PRIMARY KEY,
  game_publisher INT NOT NULL REFERENCES users(user_id),
  game_name VARCHAR(80) NOT NULL,
  game_type VARCHAR(30) NOT NULL,
  game_status VARCHAR(12) NOT NULL CHECK (game_status IN ('enabled', 'disabled')),
  game_approval_status VARCHAR(12) NOT NULL CHECK (game_approval_status IN ('approved', 'pending', 'rejected')),
  "desc" TEXT NOT NULL,
  players VARCHAR(20) NOT NULL,
  img VARCHAR(255) NOT NULL,
  rating NUMERIC(3,1) NOT NULL,
  views INT NOT NULL,
  "submittedDate" DATE NOT NULL,
  sessions INT NOT NULL,  -- play counter; royalty is derived from it
  hosting_type VARCHAR(14) CHECK (hosting_type IN ('hosted', 'selfhosted')),
  play_path VARCHAR(255),
  game_url VARCHAR(255),
  webhook_url VARCHAR(255),
  webhook_secret VARCHAR(128),
  bundle_size INT,
  bundle_uploaded_at TIMESTAMP,
  max_carys_per_match INT,
  game_mode VARCHAR(10) CHECK (game_mode IN ('single', 'multi')),
  supports_spectate BOOLEAN,
  spectate_url_template VARCHAR(255),
  achievement_budget_carys INT,
  achievement_budget_xp INT,
  scan JSONB,  -- embedded security-scan report
  bundle_hash VARCHAR(64),
  approved_bundle_hash VARCHAR(64),
  approved_game_url VARCHAR(255),
  approved_by INT REFERENCES users(user_id),
  approved_at TIMESTAMP,
  review_note TEXT,
  review_required_reason TEXT
);

CREATE TABLE game_reviews (
  review_id INT PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(game_id),
  reviewer_id INT NOT NULL REFERENCES users(user_id),
  reviewer_name VARCHAR(50) NOT NULL,  -- copy of users.user_name
  decision VARCHAR(12) NOT NULL CHECK (decision IN ('approved', 'rejected')),
  bundle_hash VARCHAR(64),
  game_url VARCHAR(255),
  scan_verdict VARCHAR(20),
  scan_summary JSONB,
  note TEXT NOT NULL,
  override BOOLEAN NOT NULL,
  decided_at TIMESTAMP NOT NULL
);

CREATE TABLE game_saves (
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  game_id INT REFERENCES games(game_id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  bytes INT NOT NULL,
  PRIMARY KEY (user_id, game_id)
);

CREATE TABLE achievements (
  achievement_id INT PRIMARY KEY,
  game_id INT REFERENCES games(game_id),  -- NULL = platform-wide achievement
  code VARCHAR(60) NOT NULL,
  name VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(16) NOT NULL,
  carys_reward INT NOT NULL,
  xp_reward INT,
  title_awarded VARCHAR(60),
  secret BOOLEAN,
  created_at TIMESTAMP NOT NULL,
  status VARCHAR(12) CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by INT REFERENCES users(user_id),
  approved_at TIMESTAMP,
  review_note TEXT,
  rule VARCHAR(40),
  threshold INT
);

CREATE TABLE player_achievements (
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  achievement_id INT REFERENCES achievements(achievement_id) ON DELETE CASCADE,
  game_id INT REFERENCES games(game_id),
  unlocked_at TIMESTAMP NOT NULL,
  session_id VARCHAR(40),
  carys_granted INT NOT NULL,
  xp_granted INT,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE deleted_games (
  game_id INT PRIMARY KEY  -- tombstone: stops a stale browser re-creating a deleted game
);

CREATE TABLE favorites (
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,  -- UNUSED legacy table - nothing reads or writes it
  game_id INT REFERENCES games(game_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, game_id)
);

CREATE TABLE reviews (
  id INT PRIMARY KEY  -- UNUSED legacy table - superseded by game_reviews
);

-- ───────── Play: sessions, matches and results ─────────

CREATE TABLE sessions (
  session_id INT PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(game_id),
  created_by INT NOT NULL REFERENCES users(user_id),
  name VARCHAR(80) NOT NULL,
  game VARCHAR(80) NOT NULL,  -- copy of games.game_name
  host VARCHAR(50) NOT NULL,  -- copy of users.user_name
  "hostId" INT NOT NULL REFERENCES users(user_id),  -- duplicates created_by
  "maxPlayers" INT NOT NULL,
  status VARCHAR(11) NOT NULL CHECK (status IN ('waiting', 'active', 'ended')),
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('casual', 'ranked')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration INT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL
);

CREATE TABLE matches (
  match_id VARCHAR(40) PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(game_id),
  game VARCHAR(80) NOT NULL,  -- copy of games.game_name
  status VARCHAR(15) NOT NULL CHECK (status IN ('in-progress', 'completed')),
  mode VARCHAR(10) CHECK (mode IN ('casual', 'ranked')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  created_by INT REFERENCES users(user_id),
  participants JSONB  -- array of user ids
);

CREATE TABLE match_results (
  session_id INT REFERENCES sessions(session_id) ON DELETE CASCADE,
  player_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  score INT NOT NULL,
  player_rank INT NOT NULL,
  joined_at TIMESTAMP NOT NULL,
  carys_earned INT,  -- in the data, not declared by the back-end interface
  xp_gained INT,  -- in the data, not declared by the back-end interface
  PRIMARY KEY (session_id, player_id)
);

-- ───────── Social: friends, chat, groups, notifications ─────────

CREATE TABLE groups (
  group_id INT PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES users(user_id),
  name VARCHAR(60) NOT NULL,
  "desc" TEXT NOT NULL,
  officer_ids JSONB NOT NULL,  -- array of user ids
  member_ids JSONB NOT NULL,  -- array of user ids
  visibility VARCHAR(11) NOT NULL CHECK (visibility IN ('public', 'private')),
  join_mode VARCHAR(15) NOT NULL CHECK (join_mode IN ('open', 'request', 'invite_only')),
  avatar VARCHAR(16),
  created_at TIMESTAMP NOT NULL
);

-- ───────── Tournaments ─────────

CREATE TABLE tournaments (
  tournament_id INT PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(game_id),
  organizer INT NOT NULL REFERENCES users(user_id),
  group_id INT REFERENCES groups(group_id),
  tournament_name VARCHAR(100) NOT NULL,
  "desc" TEXT NOT NULL,
  participants INT NOT NULL,  -- counter; should equal count of player_tournament rows
  "maxParticipants" INT NOT NULL,
  status VARCHAR(15) NOT NULL CHECK (status IN ('upcoming', 'in-progress', 'completed')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  "regClose" DATE NOT NULL,
  prize VARCHAR(60) NOT NULL,
  format VARCHAR(11) CHECK (format IN ('score', 'bracket')),
  metric VARCHAR(40),
  direction VARCHAR(8) CHECK (direction IN ('high', 'low')),
  metric_label VARCHAR(40),
  metric_unit VARCHAR(20),
  type VARCHAR(10) CHECK (type IN ('single', 'multi')),
  visibility VARCHAR(11) CHECK (visibility IN ('public', 'private')),
  invite_code VARCHAR(20),
  organizer_role VARCHAR(20),
  team_size INT,
  entry_fee_paise BIGINT,
  entry_currency VARCHAR(9) CHECK (entry_currency IN ('INR', 'CARYS')),
  entry_fee_carys INT,
  rake_pct NUMERIC(5,2),
  prize_pool_paise BIGINT,
  prize_distribution JSONB  -- array of {place, pct, amount_paise}
);

CREATE TABLE tournament_games (
  tournament_game_id INT PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(tournament_id),
  game_id INT NOT NULL REFERENCES games(game_id),
  stage_order INT NOT NULL,
  format VARCHAR(11) NOT NULL CHECK (format IN ('score', 'bracket')),
  metric VARCHAR(40),
  direction VARCHAR(8) CHECK (direction IN ('high', 'low')),
  metric_label VARCHAR(40),
  metric_unit VARCHAR(20),
  points_weight NUMERIC(6,2) NOT NULL,
  status VARCHAR(13) NOT NULL CHECK (status IN ('pending', 'active', 'completed'))
);

CREATE TABLE tournament_matches (
  match_id VARCHAR(40) PRIMARY KEY,
  "tournamentId" INT NOT NULL REFERENCES tournaments(tournament_id),
  tournament_game_id INT REFERENCES tournament_games(tournament_game_id),
  round INT NOT NULL,
  player1 INT REFERENCES users(user_id),  -- the code stores the text "BYE" for a bye; a real column should use NULL
  player2 INT REFERENCES users(user_id),  -- same as player1
  score1 INT NOT NULL,
  score2 INT NOT NULL,
  status VARCHAR(13) NOT NULL CHECK (status IN ('waiting', 'pending', 'completed', 'disputed')),
  "winnerId" INT REFERENCES users(user_id),
  "parentMatchId" VARCHAR(40) REFERENCES tournament_matches(match_id),  -- next match in the bracket
  "reportedWinner" INT,
  "reportedBy" INT REFERENCES users(user_id)
);

CREATE TABLE tournament_results (
  tournament_id INT REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  player_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  placement INT NOT NULL,
  score INT,
  prize_awarded VARCHAR(60),
  recorded_at TIMESTAMP NOT NULL,
  PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE player_tournament (
  player_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  tournament_id INT REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  PRIMARY KEY (player_id, tournament_id)
);

CREATE TABLE teams (
  team_id INT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  captain_id INT NOT NULL REFERENCES users(user_id),
  member_ids JSONB NOT NULL,  -- array of user ids
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE team_tournament (
  team_id INT REFERENCES teams(team_id) ON DELETE CASCADE,
  tournament_id INT REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, tournament_id)
);

CREATE TABLE deleted_tournaments (
  tournament_id INT PRIMARY KEY  -- tombstone: stops a stale browser re-creating a deleted tournament
);

-- ───────── Social: friends, chat, groups, notifications ─────────

CREATE TABLE friendships (
  user_a INT REFERENCES users(user_id) ON DELETE CASCADE,  -- always the smaller id (user_a < user_b)
  user_b INT REFERENCES users(user_id) ON DELETE CASCADE,
  since TIMESTAMP NOT NULL,
  removed_at TIMESTAMP,
  PRIMARY KEY (user_a, user_b)
);

CREATE TABLE friend_requests (
  id INT PRIMARY KEY,
  from_user INT NOT NULL REFERENCES users(user_id),
  to_user INT NOT NULL REFERENCES users(user_id),
  status VARCHAR(13) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP
);

CREATE TABLE messages (
  id INT PRIMARY KEY,
  from_user INT NOT NULL REFERENCES users(user_id),
  to_user INT REFERENCES users(user_id),  -- NULL on a tournament or group room message
  tournament_id INT REFERENCES tournaments(tournament_id),
  group_id INT REFERENCES groups(group_id),
  body TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL,
  delivered_at TIMESTAMP,
  deleted_for JSONB  -- array of user ids who cleared this row
);

CREATE TABLE group_join_requests (
  id INT PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(group_id),
  user_id INT NOT NULL REFERENCES users(user_id),
  status VARCHAR(13) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP
);

CREATE TABLE notifications (
  id BIGINT PRIMARY KEY,
  "toRole" VARCHAR(30),  -- broadcast to a role (matches roles.role_name)
  "toUser" INT REFERENCES users(user_id),  -- direct message; exactly one of toRole / toUser is set
  "from" VARCHAR(50) NOT NULL,  -- copy of the sender name
  avatar VARCHAR(16) NOT NULL,
  "fromRole" VARCHAR(30) NOT NULL,
  "fromUserId" INT REFERENCES users(user_id),
  msg TEXT NOT NULL,
  "time" VARCHAR(40) NOT NULL,  -- display text such as "Just now"
  "read" BOOLEAN NOT NULL,
  "readBy" JSONB,  -- array of user ids (broadcasts)
  replies JSONB NOT NULL,  -- array of reply objects
  type VARCHAR(30),
  cleared BOOLEAN,
  "clearedBy" JSONB,
  "sessionId" VARCHAR(40),
  request_id INT REFERENCES friend_requests(id),  -- friend request this notification is about
  subject VARCHAR(80)
);

-- ───────── Moderation ─────────

CREATE TABLE reports (
  report_id INT PRIMARY KEY,
  reported_by INT NOT NULL REFERENCES users(user_id),
  reported_user INT NOT NULL REFERENCES users(user_id),
  "sessionId" INT REFERENCES sessions(session_id),
  type VARCHAR(40) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'under-review', 'resolved', 'rejected')),
  report_date DATE NOT NULL,
  "session" VARCHAR(80) NOT NULL,  -- copy of the session name
  "time" VARCHAR(40) NOT NULL,
  "actionNote" TEXT NOT NULL
);

CREATE TABLE moderator_actions (
  action_id INT PRIMARY KEY,
  moderator_id INT NOT NULL REFERENCES users(user_id),
  report_id INT NOT NULL REFERENCES reports(report_id),
  action_type VARCHAR(12) NOT NULL CHECK (action_type IN ('warning', 'restrict', 'ban', 'review')),
  action_date DATE NOT NULL,
  action_reason TEXT NOT NULL
);

CREATE TABLE bans (
  id INT PRIMARY KEY,
  "playerId" INT NOT NULL REFERENCES users(user_id),
  "playerName" VARCHAR(50) NOT NULL,  -- copy of users.user_name
  level INT NOT NULL,
  duration VARCHAR(30) NOT NULL,
  reason TEXT NOT NULL,
  "bannedBy" VARCHAR(50) NOT NULL,  -- copy of the admin name
  "bannedById" INT NOT NULL REFERENCES users(user_id),
  "bannedDate" DATE NOT NULL,
  "expiresDate" DATE NOT NULL,
  active BOOLEAN NOT NULL
);

-- ───────── Economy: Carys, shop, subscriptions, payouts ─────────

CREATE TABLE cosmetic_items (
  id INT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  category VARCHAR(30) NOT NULL,
  slot VARCHAR(20),  -- where on the avatar the item is worn
  price_paise BIGINT NOT NULL,
  price_carys INT,
  rarity VARCHAR(20) NOT NULL,
  preview VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  asset_url VARCHAR(255),
  layer INT,
  is_mystery BOOLEAN,
  model_url VARCHAR(255),
  emotes JSONB,
  ring_color VARCHAR(20),
  ring_glow VARCHAR(40),
  burst JSONB,
  model_url_static VARCHAR(255),
  attach_bone VARCHAR(40),
  attach_offset JSONB,
  attach_rotation JSONB,
  attach_scale NUMERIC(6,3)
);

CREATE TABLE user_cosmetics (
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  item_id INT REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP NOT NULL,
  is_equipped BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE subscription_plans (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  price_paise BIGINT NOT NULL,
  "interval" VARCHAR(20) NOT NULL,
  features JSONB NOT NULL,
  stipend_carys INT NOT NULL
);

CREATE TABLE subscriptions (
  id INT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id),
  tier VARCHAR(30) NOT NULL REFERENCES subscription_plans(id),  -- the subscription_plans.id
  status VARCHAR(13) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  price_paise BIGINT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_stipend_at TIMESTAMP
);

CREATE TABLE transactions (
  id INT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id),
  type VARCHAR(21) NOT NULL CHECK (type IN ('subscription', 'cosmetic_purchase', 'tournament_entry', 'payout')),
  amount_paise BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(13) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  ref_type VARCHAR(30),  -- what ref_id points at (polymorphic)
  ref_id VARCHAR(40),
  idempotency_key VARCHAR(80) UNIQUE  -- retry-safe key
);

CREATE TABLE carys_ledger (
  entry_id INT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id),
  delta INT NOT NULL,
  reason VARCHAR(60) NOT NULL,
  ref_type VARCHAR(30),  -- what ref_id points at (polymorphic)
  ref_id VARCHAR(40),
  balance_after INT NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE payouts (
  payout_id INT PRIMARY KEY,
  publisher_id INT NOT NULL REFERENCES users(user_id),
  period VARCHAR(40) NOT NULL,
  gross_paise BIGINT NOT NULL,
  platform_cut_paise BIGINT NOT NULL,
  net_paise BIGINT NOT NULL,
  status VARCHAR(14) NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  created_at TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  source VARCHAR(14) CHECK (source IN ('admin', 'withdrawal')),
  method VARCHAR(8) CHECK (method IN ('upi', 'bank')),
  destination_masked VARCHAR(60),  -- never the full account number
  gateway_ref VARCHAR(60),
  failure_reason TEXT,
  royalty_carys INT,
  rake_paise BIGINT
);

-- ───────── Platform ─────────

CREATE TABLE platform_flags (
  flag VARCHAR(60) PRIMARY KEY,
  set_at TIMESTAMP NOT NULL
);

-- ───────── Relationships the schema cannot enforce today ─────────
-- These are stored as a JSON list of ids inside one column, so the database
-- cannot check them. A normalised version would give each its own join table:
--   teams.member_ids  ->  users.user_id   (JSON list, not a foreign key)
--   groups.member_ids  ->  users.user_id   (JSON list, not a foreign key)
--   groups.officer_ids  ->  users.user_id   (JSON list, not a foreign key)
--   matches.participants  ->  users.user_id   (JSON list, not a foreign key)
--   messages.deleted_for  ->  users.user_id   (JSON list, not a foreign key)
--   notifications.readBy  ->  users.user_id   (JSON list, not a foreign key)
--   notifications.toRole -> roles.role_name   (matches by name, not id)
--   transactions.ref_type/ref_id, carys_ledger.ref_type/ref_id   (polymorphic: ref_type says which table ref_id is in)
-- favorites: unused legacy table (nothing in the code reads or writes it).
-- reviews: unused legacy table (nothing in the code reads or writes it).
