CREATE DATABASE IF NOT EXISTS playcarys;
USE playcarys;
CREATE TABLE ROLE (
role_id INT PRIMARY KEY,
role_name VARCHAR(50) NOT NULL
);
CREATE TABLE USERS (
user_id INT PRIMARY KEY,
user_name VARCHAR(50) NOT NULL,
role_id INT NOT NULL,
email VARCHAR(255) NOT NULL UNIQUE,
password VARCHAR(255) NOT NULL,
CONSTRAINT fk_user_role
FOREIGN KEY (role_id) REFERENCES ROLE(role_id),
CONSTRAINT password_length
CHECK (LENGTH(password) >= 8)
);
CREATE TABLE PLAYER_PROFILE (
user_id INT PRIMARY KEY,
player_name VARCHAR(50) UNIQUE,
carys_points INT DEFAULT 0,
play_time INT DEFAULT 0,
matches_won INT DEFAULT 0,
player_status BOOLEAN,
CONSTRAINT fk_player_user
FOREIGN KEY (user_id) REFERENCES USERS(user_id),
CONSTRAINT points_non_negative
CHECK (carys_points >= 0),
CONSTRAINT play_time_non_negative
CHECK (play_time >= 0),
CONSTRAINT matches_won_non_negative
CHECK (matches_won >= 0)
);
CREATE TABLE PUBLISHER_PROFILE (
user_id INT PRIMARY KEY,
total_games INT DEFAULT 0,
approved_games INT DEFAULT 0,
active_games INT DEFAULT 0,
CONSTRAINT fk_publisher_user
FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);
CREATE TABLE GAME (
game_id INT PRIMARY KEY,
game_name VARCHAR(100) UNIQUE NOT NULL,
game_type VARCHAR(50),
game_status VARCHAR(20),
game_approval_status VARCHAR(20),
game_publisher INT NOT NULL,
CONSTRAINT fk_game_publisher
FOREIGN KEY (game_publisher) REFERENCES USERS(user_id)
);
CREATE TABLE TOURNAMENT (
tournament_id INT PRIMARY KEY,
game_id INT NOT NULL,
tournament_name VARCHAR(100) UNIQUE NOT NULL,
start_date DATE NOT NULL,
end_date DATE NOT NULL,
CONSTRAINT fk_tournament_game
FOREIGN KEY (game_id) REFERENCES GAME(game_id),
CONSTRAINT tournament_date_check
CHECK (start_date <= end_date)
);
CREATE TABLE GAME_SESSION (
session_id INT PRIMARY KEY,
game_id INT NOT NULL,
created_by INT NOT NULL,
start_time TIMESTAMP NOT NULL,
end_time TIMESTAMP NOT NULL,
status VARCHAR(20),
CONSTRAINT fk_session_game
FOREIGN KEY (game_id) REFERENCES GAME(game_id),
CONSTRAINT fk_session_creator
FOREIGN KEY (created_by) REFERENCES USERS(user_id),
CONSTRAINT session_time_check
CHECK (start_time < end_time)
);
CREATE TABLE MATCH_RESULT (
session_id INT,
player_id INT,
score INT,
player_rank INT,
joined_at TIMESTAMP NOT NULL,
PRIMARY KEY (session_id, player_id),
CONSTRAINT fk_match_session
FOREIGN KEY (session_id) REFERENCES GAME_SESSION(session_id),
CONSTRAINT fk_match_player
FOREIGN KEY (player_id) REFERENCES PLAYER_PROFILE(user_id),
CONSTRAINT rank_non_negative
CHECK (player_rank >= 0)
);
CREATE TABLE REPORT (
report_id INT PRIMARY KEY,
reported_by INT NOT NULL,
reported_user INT NOT NULL,
reason TEXT NOT NULL,
status VARCHAR(30) DEFAULT 'inreview',
report_date DATE,
CONSTRAINT fk_report_by
FOREIGN KEY (reported_by) REFERENCES USERS(user_id),
CONSTRAINT fk_report_user
FOREIGN KEY (reported_user) REFERENCES USERS(user_id)
);
CREATE TABLE MODERATOR_ACTION (
action_id INT PRIMARY KEY,
moderator_id INT NOT NULL,
report_id INT NOT NULL,
action_type VARCHAR(50),
action_date DATE,
action_reason TEXT,
CONSTRAINT fk_action_moderator
FOREIGN KEY (moderator_id) REFERENCES USERS(user_id),
CONSTRAINT fk_action_report
FOREIGN KEY (report_id) REFERENCES REPORT(report_id)
);
CREATE TABLE player_tournament (
player_id INT,
tournament_id INT,
PRIMARY KEY (player_id, tournament_id),
FOREIGN KEY (player_id) REFERENCES player_profile(user_id),
FOREIGN KEY (tournament_id) REFERENCES tournament(tournament_id)
);
CREATE TABLE player_session (
player_id INT,
session_id INT,
PRIMARY KEY (player_id, session_id),
FOREIGN KEY (player_id) REFERENCES player_profile(user_id),
FOREIGN KEY (session_id) REFERENCES game_session(session_id)
);
