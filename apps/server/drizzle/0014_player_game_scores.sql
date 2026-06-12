CREATE TABLE IF NOT EXISTS "player_game_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "game_id" uuid NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_game_scores"
  ADD CONSTRAINT "player_game_scores_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE cascade
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_game_scores"
  ADD CONSTRAINT "player_game_scores_game_id_games_id_fk"
  FOREIGN KEY ("game_id")
  REFERENCES "games"("id")
  ON DELETE cascade
  ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_game_scores_user_id_game_id_unique"
  ON "player_game_scores" ("user_id", "game_id");
--> statement-breakpoint
ALTER TABLE "player_game_scores" DROP CONSTRAINT IF EXISTS "player_game_scores_score_non_negative_check";
--> statement-breakpoint
ALTER TABLE "player_game_scores"
  ADD CONSTRAINT "player_game_scores_score_non_negative_check"
  CHECK ("score" >= 0);
