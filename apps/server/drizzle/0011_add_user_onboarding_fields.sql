ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" varchar(128);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "province" varchar(128);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" varchar(128);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" varchar(16);

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_age_range_check" CHECK ("age" is null or ("age" >= 1 and "age" <= 120));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_gender_check" CHECK ("gender" is null or "gender" in ('male', 'female'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
