CREATE TABLE IF NOT EXISTS "direct_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sender_id" uuid NOT NULL,
  "receiver_id" uuid NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "direct_messages"
  ADD CONSTRAINT "direct_messages_sender_id_users_id_fk"
  FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "direct_messages"
  ADD CONSTRAINT "direct_messages_receiver_id_users_id_fk"
  FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_messages_sender_receiver_created_at_idx"
  ON "direct_messages" USING btree ("sender_id", "receiver_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_messages_receiver_sender_created_at_idx"
  ON "direct_messages" USING btree ("receiver_id", "sender_id", "created_at" DESC);
