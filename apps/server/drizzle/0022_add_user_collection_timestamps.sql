ALTER TABLE "users"
ADD COLUMN "last_gem_collection_at" timestamp DEFAULT NOW() NOT NULL,
ADD COLUMN "last_xp_collection_at" timestamp DEFAULT NOW() NOT NULL;
