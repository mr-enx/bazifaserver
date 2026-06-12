CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" varchar(64) NOT NULL,
  "password_hash" text NOT NULL,
  "avatar_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_username_unique" UNIQUE ("username")
);

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_seen_at" timestamp DEFAULT now() NOT NULL,
  "is_revoked" boolean DEFAULT false NOT NULL,
  "device_info" text,
  CONSTRAINT "user_sessions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "games" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "name" varchar(128) NOT NULL,
  "min_players" integer NOT NULL,
  "max_players" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "games_slug_unique" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" varchar(32) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "rooms_game_id_games_id_fk"
    FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "rooms_owner_user_id_users_id_fk"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "rooms_status_check" CHECK ("status" in ('waiting', 'in_game', 'finished'))
);

CREATE TABLE IF NOT EXISTS "room_players" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  "is_ready" boolean DEFAULT false NOT NULL,
  "is_connected" boolean DEFAULT true NOT NULL,
  "seat_index" integer,
  CONSTRAINT "room_players_room_id_rooms_id_fk"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "room_players_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS "room_players_room_id_user_id_unique"
  ON "room_players" ("room_id", "user_id");

CREATE TABLE IF NOT EXISTS "room_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "room_messages_room_id_rooms_id_fk"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "room_messages_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "game_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "game_id" uuid NOT NULL,
  "started_at" timestamp,
  "ended_at" timestamp,
  "status" varchar(32) NOT NULL,
  "winner_user_id" uuid,
  "match_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "game_matches_room_id_rooms_id_fk"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "game_matches_game_id_games_id_fk"
    FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "game_matches_winner_user_id_users_id_fk"
    FOREIGN KEY ("winner_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "game_matches_status_check" CHECK ("status" in ('pending', 'active', 'finished'))
);
