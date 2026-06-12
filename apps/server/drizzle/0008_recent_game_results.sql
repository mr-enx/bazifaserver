CREATE TABLE "game_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_id" uuid NOT NULL,
  "game_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "game_name" varchar(128) NOT NULL,
  "player_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "opponent_score" integer DEFAULT 0 NOT NULL,
  "score_by_user_id" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "outcome" varchar(32) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "game_results_outcome_check" CHECK ("outcome" in ('won', 'lost', 'draw')),
  CONSTRAINT "game_results_score_non_negative_check" CHECK ("score" >= 0),
  CONSTRAINT "game_results_opponent_score_non_negative_check" CHECK ("opponent_score" >= 0)
);
--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_match_id_game_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."game_matches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "game_results_match_id_user_id_unique" ON "game_results" USING btree ("match_id","user_id");
