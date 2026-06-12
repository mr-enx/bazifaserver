ALTER TABLE "game_matches" DROP COLUMN IF EXISTS "started_at";
--> statement-breakpoint
ALTER TABLE "game_matches" DROP COLUMN IF EXISTS "ended_at";
--> statement-breakpoint
ALTER TABLE "game_matches" DROP COLUMN IF EXISTS "winner_user_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "game_results" CASCADE;
--> statement-breakpoint
CREATE TABLE "game_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL,
  "data_results" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;
