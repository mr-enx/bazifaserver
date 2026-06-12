ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "point_rules" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "games"
SET "point_rules" = '{"base_points":5,"round_win_points":5,"final_win_multiplier":2}'::jsonb
WHERE "slug" = 'tic_tac_toe';
--> statement-breakpoint
UPDATE "games"
SET "point_rules" = '{"base_points":4,"round_win_points":3,"final_win_multiplier":1.4}'::jsonb
WHERE "slug" = 'image_guess';
--> statement-breakpoint
INSERT INTO "games" ("slug", "name", "min_players", "max_players", "is_active", "point_rules")
VALUES ('ludo', 'Ludo', 2, 4, false, '{"base_points":20,"finished_token_points":5,"step_points":0.1,"final_win_multiplier":1.5}'::jsonb)
ON CONFLICT ("slug") DO UPDATE SET "point_rules" = excluded."point_rules";
