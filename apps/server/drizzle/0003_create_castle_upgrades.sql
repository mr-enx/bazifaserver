CREATE TABLE IF NOT EXISTS "castle_upgrades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" integer NOT NULL,
	"required_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "castle_upgrades_level_unique" UNIQUE("level")
);

ALTER TABLE "castle_upgrades" ADD CONSTRAINT "castle_upgrades_level_check" CHECK ("level" > 0);
