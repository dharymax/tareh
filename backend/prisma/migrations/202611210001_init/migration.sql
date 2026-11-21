CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'HALF_TIME', 'PAUSED', 'FINISHED', 'POSTPONED', 'CANCELLED', 'ABANDONED');
CREATE TYPE "Platform" AS ENUM ('ANDROID', 'IOS', 'WEB');
CREATE TYPE "PointTransactionReason" AS ENUM ('SETTLEMENT', 'REVERSAL', 'ADMIN_ADJUSTMENT');
CREATE TYPE "PredictionResultType" AS ENUM ('EXACT_SCORE', 'CORRECT_OUTCOME', 'CORRECT_TOTAL_GOALS', 'INCORRECT');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "phone_e164" VARCHAR(20) NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "phone_verified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");

CREATE TABLE "user_profiles" (
  "user_id" UUID NOT NULL,
  "display_name" VARCHAR(60) NOT NULL,
  "avatar_url" TEXT,
  "locale" VARCHAR(10) NOT NULL DEFAULT 'ar',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "roles" (
  "id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

CREATE TABLE "user_roles" (
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "countries" (
  "id" UUID NOT NULL,
  "iso2" CHAR(2),
  "name" VARCHAR(100) NOT NULL,
  CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "countries_iso2_key" ON "countries"("iso2");

CREATE TABLE "leagues" (
  "id" UUID NOT NULL,
  "provider_code" VARCHAR(60) NOT NULL DEFAULT 'primary',
  "provider_key" VARCHAR(100),
  "country_id" UUID,
  "name" VARCHAR(160) NOT NULL,
  "logo_url" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leagues_provider_code_provider_key_key" ON "leagues"("provider_code", "provider_key");
CREATE INDEX "leagues_is_enabled_name_idx" ON "leagues"("is_enabled", "name");

CREATE TABLE "seasons" (
  "id" UUID NOT NULL,
  "league_id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "starts_on" DATE,
  "ends_on" DATE,
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "seasons_league_id_name_key" ON "seasons"("league_id", "name");

CREATE TABLE "teams" (
  "id" UUID NOT NULL,
  "provider_code" VARCHAR(60) NOT NULL DEFAULT 'primary',
  "provider_key" VARCHAR(100),
  "country_id" UUID,
  "name" VARCHAR(160) NOT NULL,
  "short_name" VARCHAR(40),
  "logo_url" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "teams_provider_code_provider_key_key" ON "teams"("provider_code", "provider_key");
CREATE INDEX "teams_name_idx" ON "teams"("name");

CREATE TABLE "players" (
  "id" UUID NOT NULL,
  "provider_code" VARCHAR(60) NOT NULL DEFAULT 'primary',
  "provider_key" VARCHAR(100),
  "team_id" UUID,
  "name" VARCHAR(160) NOT NULL,
  "position" VARCHAR(40),
  "shirt_number" SMALLINT,
  CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "players_provider_code_provider_key_key" ON "players"("provider_code", "provider_key");

CREATE TABLE "matches" (
  "id" UUID NOT NULL,
  "provider_code" VARCHAR(60) NOT NULL DEFAULT 'primary',
  "provider_key" VARCHAR(120),
  "league_id" UUID NOT NULL,
  "season_id" UUID,
  "home_team_id" UUID NOT NULL,
  "away_team_id" UUID NOT NULL,
  "kickoff_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
  "home_score" SMALLINT,
  "away_score" SMALLINT,
  "result_confirmed_at" TIMESTAMPTZ(6),
  "last_provider_update_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "matches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "matches_distinct_teams_check" CHECK ("home_team_id" <> "away_team_id"),
  CONSTRAINT "matches_nonnegative_score_check" CHECK (
    ("home_score" IS NULL AND "away_score" IS NULL) OR
    ("home_score" >= 0 AND "away_score" >= 0)
  )
);
CREATE UNIQUE INDEX "matches_provider_code_provider_key_key" ON "matches"("provider_code", "provider_key");
CREATE INDEX "matches_kickoff_at_status_idx" ON "matches"("kickoff_at", "status");
CREATE INDEX "matches_league_id_kickoff_at_idx" ON "matches"("league_id", "kickoff_at");
CREATE INDEX "matches_status_kickoff_at_idx" ON "matches"("status", "kickoff_at");

CREATE TABLE "match_events" (
  "id" UUID NOT NULL,
  "match_id" UUID NOT NULL,
  "provider_event_key" VARCHAR(120),
  "minute" SMALLINT,
  "added_minute" SMALLINT,
  "event_type" VARCHAR(40) NOT NULL,
  "team_id" UUID,
  "player_id" UUID,
  "detail" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "match_events_match_id_provider_event_key_key" ON "match_events"("match_id", "provider_event_key");
CREATE INDEX "match_events_match_id_minute_idx" ON "match_events"("match_id", "minute");

CREATE TABLE "match_statistics" (
  "id" UUID NOT NULL,
  "match_id" UUID NOT NULL,
  "team_id" UUID NOT NULL,
  "statistic_key" VARCHAR(60) NOT NULL,
  "statistic_value" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "match_statistics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "match_statistics_match_id_team_id_statistic_key_key"
  ON "match_statistics"("match_id", "team_id", "statistic_key");

CREATE TABLE "predictions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "match_id" UUID NOT NULL,
  "home_goals" SMALLINT NOT NULL,
  "away_goals" SMALLINT NOT NULL,
  "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "locked_at" TIMESTAMPTZ(6),
  CONSTRAINT "predictions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "predictions_home_goals_check" CHECK ("home_goals" BETWEEN 0 AND 30),
  CONSTRAINT "predictions_away_goals_check" CHECK ("away_goals" BETWEEN 0 AND 30)
);
CREATE UNIQUE INDEX "predictions_user_id_match_id_key" ON "predictions"("user_id", "match_id");
CREATE INDEX "predictions_match_id_idx" ON "predictions"("match_id");
CREATE INDEX "predictions_user_id_submitted_at_idx" ON "predictions"("user_id", "submitted_at");

CREATE TABLE "scoring_rules" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "exact_score_points" SMALLINT NOT NULL,
  "correct_outcome_points" SMALLINT NOT NULL,
  "correct_total_goals_points" SMALLINT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "scoring_rules_version_key" ON "scoring_rules"("version");

CREATE TABLE "prediction_results" (
  "id" UUID NOT NULL,
  "prediction_id" UUID NOT NULL,
  "scoring_rule_id" UUID NOT NULL,
  "points" SMALLINT NOT NULL,
  "result_type" "PredictionResultType" NOT NULL,
  "settled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prediction_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prediction_results_points_check" CHECK ("points" >= 0)
);
CREATE UNIQUE INDEX "prediction_results_prediction_id_scoring_rule_id_key"
  ON "prediction_results"("prediction_id", "scoring_rule_id");

CREATE TABLE "point_transactions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "prediction_result_id" UUID NOT NULL,
  "points_delta" INTEGER NOT NULL,
  "reason" "PointTransactionReason" NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "point_transactions_idempotency_key_key" ON "point_transactions"("idempotency_key");
CREATE INDEX "point_transactions_user_id_created_at_idx" ON "point_transactions"("user_id", "created_at");

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "body" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

CREATE TABLE "device_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token" TEXT NOT NULL,
  "platform" "Platform" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ(6),
  CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

CREATE TABLE "provider_configs" (
  "id" UUID NOT NULL,
  "provider_code" VARCHAR(60) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "secret_reference" TEXT,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "provider_configs_provider_code_key" ON "provider_configs"("provider_code");

CREATE TABLE "sync_logs" (
  "id" UUID NOT NULL,
  "provider_code" VARCHAR(60) NOT NULL,
  "resource_type" VARCHAR(40) NOT NULL,
  "started_at" TIMESTAMPTZ(6) NOT NULL,
  "finished_at" TIMESTAMPTZ(6),
  "status" VARCHAR(20) NOT NULL,
  "records_read" INTEGER NOT NULL DEFAULT 0,
  "records_written" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sync_logs_provider_code_started_at_idx" ON "sync_logs"("provider_code", "started_at");

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "actor_user_id" UUID,
  "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(60) NOT NULL,
  "entity_id" UUID,
  "before_data" JSONB,
  "after_data" JSONB,
  "ip_address" INET,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_fkey"
  FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_id_fkey"
  FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_fkey"
  FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey"
  FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey"
  FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey"
  FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "match_statistics" ADD CONSTRAINT "match_statistics_match_id_fkey"
  FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_statistics" ADD CONSTRAINT "match_statistics_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey"
  FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_prediction_id_fkey"
  FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_scoring_rule_id_fkey"
  FOREIGN KEY ("scoring_rule_id") REFERENCES "scoring_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_prediction_result_id_fkey"
  FOREIGN KEY ("prediction_result_id") REFERENCES "prediction_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
