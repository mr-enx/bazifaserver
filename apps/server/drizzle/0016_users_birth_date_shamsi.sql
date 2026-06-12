ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "birth_date_shamsi" varchar(10);

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_birth_date_shamsi_format_check"
    CHECK ("birth_date_shamsi" is null or "birth_date_shamsi" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
