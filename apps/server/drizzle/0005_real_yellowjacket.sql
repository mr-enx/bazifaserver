CREATE TABLE IF NOT EXISTS "settings" (
  "id" varchar(32) PRIMARY KEY DEFAULT 'default',
  "version" varchar(32) NOT NULL,
  "changelog" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_changelog_version" varchar(32);