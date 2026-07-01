UPDATE "users"
SET "email_verified" = COALESCE("email_verified", "created_at", now())
WHERE "password_hash" IS NOT NULL
  AND "email_verified" IS NULL;
