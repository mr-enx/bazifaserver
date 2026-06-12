ALTER TABLE "direct_messages"
ADD COLUMN IF NOT EXISTS "is_seen" boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS "direct_messages_receiver_seen_created_at_idx"
  ON "direct_messages" USING btree ("receiver_id", "is_seen", "created_at" DESC);
