DELETE FROM "room_players" AS stale
USING "room_players" AS keep
WHERE stale."user_id" = keep."user_id"
  AND stale."joined_at" < keep."joined_at";

CREATE UNIQUE INDEX IF NOT EXISTS "room_players_user_id_unique"
  ON "room_players" ("user_id");
