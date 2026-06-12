CREATE TABLE IF NOT EXISTS "friend_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sender_id" uuid NOT NULL,
  "receiver_id" uuid NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "responded_at" timestamp,
  CONSTRAINT "friend_requests_status_check" CHECK ("status" in ('pending', 'accepted', 'rejected', 'cancelled')),
  CONSTRAINT "friend_requests_no_self_check" CHECK ("sender_id" <> "receiver_id")
);
--> statement-breakpoint
ALTER TABLE "friend_requests"
  ADD CONSTRAINT "friend_requests_sender_id_users_id_fk"
  FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "friend_requests"
  ADD CONSTRAINT "friend_requests_receiver_id_users_id_fk"
  FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "friendships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "friend_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "friendships_no_self_check" CHECK ("user_id" <> "friend_id")
);
--> statement-breakpoint
ALTER TABLE "friendships"
  ADD CONSTRAINT "friendships_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "friendships"
  ADD CONSTRAINT "friendships_friend_id_users_id_fk"
  FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "type" varchar(32) NOT NULL,
  "actor_id" uuid NOT NULL,
  "friend_request_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "notifications_type_check" CHECK ("type" in ('friend_request'))
);
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_actor_id_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_friend_request_id_friend_requests_id_fk"
  FOREIGN KEY ("friend_request_id") REFERENCES "public"."friend_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_user_id_friend_id_unique"
  ON "friendships" USING btree ("user_id", "friend_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_friend_request_id_user_id_unique"
  ON "notifications" USING btree ("friend_request_id", "user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "friend_requests_pending_pair_unique"
  ON "friend_requests" (LEAST("sender_id", "receiver_id"), GREATEST("sender_id", "receiver_id"))
  WHERE "status" = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_user_id_created_at_idx"
  ON "friendships" USING btree ("user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx"
  ON "notifications" USING btree ("user_id", "created_at" DESC);
