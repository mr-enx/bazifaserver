ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp" integer;

UPDATE "users"
SET "xp" =
  CASE
    WHEN "level" IS NULL OR "level" <= 1 THEN 0
    ELSE
      ((("level" - 1) * (2 * 80 + ("level" - 2) * 40)) / 2)
  END
WHERE "xp" IS NULL;

UPDATE "users"
SET "xp" = 0
WHERE "xp" IS NULL;

ALTER TABLE "users" ALTER COLUMN "xp" SET DEFAULT 0;
ALTER TABLE "users" ALTER COLUMN "xp" SET NOT NULL;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_level_positive_check";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_xp_positive_check";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_xp_non_negative_check";
ALTER TABLE "users" ADD CONSTRAINT "users_xp_non_negative_check" CHECK ("xp" >= 0);

ALTER TABLE "users" DROP COLUMN IF EXISTS "level";
