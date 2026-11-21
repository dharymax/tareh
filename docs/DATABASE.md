# TAREH — Database Design

Database: PostgreSQL. ORM: Prisma. Primary identifiers: UUID. Store timestamps in UTC; render in Asia/Aden.

## Entity model
- users 1—1 user_profiles
- users M—N roles through user_roles
- leagues 1—N seasons
- leagues 1—N matches
- seasons 1—N matches
- teams 1—N matches as home team and away team
- matches 1—N match_events
- matches 1—N match_statistics
- users 1—N predictions
- matches 1—N predictions
- predictions 1—N prediction_results; results 1—N point_transactions (settlement and reversal history)
- users 1—N notifications and device_tokens
- provider_configs 1—N sync_logs

## Core PostgreSQL schema (reference DDL)\n\nThe implementation source of truth is `backend/prisma/schema.prisma`; keep this conceptual DDL synchronized when the Prisma schema changes.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','SUSPENDED','DELETED')),
  phone_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(60) NOT NULL,
  avatar_url TEXT,
  locale VARCHAR(10) NOT NULL DEFAULT 'ar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(80) NOT NULL
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2 CHAR(2) UNIQUE,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key VARCHAR(100),
  country_id UUID REFERENCES countries(id),
  name VARCHAR(160) NOT NULL,
  logo_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (provider_key)
);

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  name VARCHAR(80) NOT NULL,
  starts_on DATE,
  ends_on DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (league_id, name)
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key VARCHAR(100) UNIQUE,
  country_id UUID REFERENCES countries(id),
  name VARCHAR(160) NOT NULL,
  short_name VARCHAR(40),
  logo_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key VARCHAR(100) UNIQUE,
  team_id UUID REFERENCES teams(id),
  name VARCHAR(160) NOT NULL,
  position VARCHAR(40),
  shirt_number SMALLINT
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key VARCHAR(120) UNIQUE,
  league_id UUID NOT NULL REFERENCES leagues(id),
  season_id UUID REFERENCES seasons(id),
  home_team_id UUID NOT NULL REFERENCES teams(id),
  away_team_id UUID NOT NULL REFERENCES teams(id),
  kickoff_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED','LIVE','HALF_TIME','PAUSED','FINISHED',
      'POSTPONED','CANCELLED','ABANDONED')),
  home_score SMALLINT,
  away_score SMALLINT,
  result_confirmed_at TIMESTAMPTZ,
  last_provider_update_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (home_team_id <> away_team_id),
  CHECK ((home_score IS NULL AND away_score IS NULL) OR
         (home_score >= 0 AND away_score >= 0))
);
CREATE INDEX matches_kickoff_status_idx ON matches(kickoff_at, status);
CREATE INDEX matches_league_kickoff_idx ON matches(league_id, kickoff_at);

CREATE TABLE match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  provider_event_key VARCHAR(120),
  minute SMALLINT,
  added_minute SMALLINT,
  event_type VARCHAR(40) NOT NULL,
  team_id UUID REFERENCES teams(id),
  player_id UUID REFERENCES players(id),
  detail JSONB NOT NULL DEFAULT '{}',
  UNIQUE(match_id, provider_event_key)
);

CREATE TABLE match_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  statistic_key VARCHAR(60) NOT NULL,
  statistic_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, team_id, statistic_key)
);

CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  match_id UUID NOT NULL REFERENCES matches(id),
  home_goals SMALLINT NOT NULL CHECK (home_goals BETWEEN 0 AND 30),
  away_goals SMALLINT NOT NULL CHECK (away_goals BETWEEN 0 AND 30),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  UNIQUE(user_id, match_id)
);
CREATE INDEX predictions_match_idx ON predictions(match_id);
CREATE INDEX predictions_user_submitted_idx ON predictions(user_id, submitted_at DESC);

CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER UNIQUE NOT NULL,
  exact_score_points SMALLINT NOT NULL,
  correct_outcome_points SMALLINT NOT NULL,
  correct_total_goals_points SMALLINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id),
  scoring_rule_id UUID NOT NULL REFERENCES scoring_rules(id),
  points SMALLINT NOT NULL CHECK (points >= 0),
  result_type VARCHAR(30) NOT NULL,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prediction_id, scoring_rule_id)
);

CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  prediction_result_id UUID NOT NULL REFERENCES prediction_results(id),
  points_delta INTEGER NOT NULL,
  reason VARCHAR(40) NOT NULL,
  idempotency_key VARCHAR(160) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX point_transactions_user_created_idx
  ON point_transactions(user_id, created_at DESC);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  platform VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code VARCHAR(60) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  secret_reference TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code VARCHAR(60) NOT NULL,
  resource_type VARCHAR(40) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL,
  records_read INTEGER NOT NULL DEFAULT 0,
  records_written INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Important implementation notes\n\n9. Scoring uses `correct_total_goals_points`, not goal difference: getting goal difference correct always implies getting the match outcome correct, so those two categories would overlap. Total-goals scoring is awarded only when the outcome is wrong but the combined goals total matches.
1. Execute prediction create/update in a transaction and lock/read the match row before checking kickoff/status, to reduce race conditions.
2. Enforce the unique (user_id, match_id) constraint at database level.
3. Never update historical point transactions. Corrections create explicit reversal entries and replacement settlements.
4. Reconcile leaderboard totals from point_transactions; cache only as a derived projection.
5. Restrict result finalization and resettlement to specific admin permissions and write audit logs.
6. Provider IDs are not always globally unique across vendors; if multiple vendors are supported, replace provider_key uniqueness with (provider_code, provider_key).
7. Provider API secrets belong in a secrets manager or protected environment configuration; secret_reference is not the secret itself.
8. Define retention, account deletion and privacy procedures before production.
