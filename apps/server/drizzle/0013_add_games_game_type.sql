ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "game_type" varchar(16) DEFAULT 'online' NOT NULL;
--> statement-breakpoint
UPDATE "games"
SET "game_type" = 'online'
WHERE "slug" IN ('tic_tac_toe', 'image_guess');
--> statement-breakpoint
UPDATE "games"
SET "game_type" = 'offline'
WHERE "slug" = 'ludo';
--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT IF EXISTS "games_game_type_check";
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_game_type_check" CHECK ("game_type" in ('online', 'offline'));
