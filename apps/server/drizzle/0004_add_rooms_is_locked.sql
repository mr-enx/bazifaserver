ALTER TABLE "rooms"
  ADD COLUMN IF NOT EXISTS "is_locked" boolean DEFAULT false NOT NULL;
