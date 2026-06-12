ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" varchar(32);
--> statement-breakpoint
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "password_hash";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_unique"
  ON "users" ("phone");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope" varchar(64) NOT NULL,
  "key" varchar(255) NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "window_start" timestamp DEFAULT now() NOT NULL,
  "blocked_until" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_rate_limits_scope_key_unique"
  ON "auth_rate_limits" ("scope", "key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" varchar(128) NOT NULL,
  "phone" varchar(32) NOT NULL,
  "email" varchar(255),
  "username" varchar(64),
  "avatar_url" text,
  "method" varchar(32) NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "token" text,
  "token_expires" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "otp_requests_method_check" CHECK ("method" in ('login', 'register'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "otp_requests_request_id_unique"
  ON "otp_requests" ("request_id");
