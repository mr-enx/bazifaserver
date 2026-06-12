ALTER TABLE "room_players"
  ADD COLUMN IF NOT EXISTS "cancel_requested" boolean DEFAULT false NOT NULL;
