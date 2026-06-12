CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_token_hash_unique"
  ON "user_sessions" ("token_hash");

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_lower_unique"
  ON "users" (lower("username"));
