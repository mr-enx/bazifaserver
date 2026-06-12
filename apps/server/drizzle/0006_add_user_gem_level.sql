ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "gem" integer DEFAULT 0 NOT NULL;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "level" integer DEFAULT 1 NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_gem_non_negative_check'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_gem_non_negative_check" CHECK ("gem" >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_level_positive_check'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_level_positive_check" CHECK ("level" >= 1);
  END IF;
END $$;
