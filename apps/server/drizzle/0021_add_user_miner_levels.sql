ALTER TABLE "users"
ADD COLUMN "xp_miner_level" integer DEFAULT 0 NOT NULL,
ADD COLUMN "gem_miner_level" integer DEFAULT 0 NOT NULL;

ALTER TABLE "users"
ADD CONSTRAINT "users_xp_miner_level_non_negative_check" CHECK ("xp_miner_level" >= 0);

ALTER TABLE "users"
ADD CONSTRAINT "users_gem_miner_level_non_negative_check" CHECK ("gem_miner_level" >= 0);
