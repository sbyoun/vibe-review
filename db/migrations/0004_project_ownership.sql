DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_type') THEN
    CREATE TYPE "project_type" AS ENUM ('owned', 'external');
  END IF;
END $$;

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "submitted_by_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "project_type" "project_type" DEFAULT 'owned' NOT NULL,
  ADD COLUMN IF NOT EXISTS "external_owner_name" varchar(160),
  ADD COLUMN IF NOT EXISTS "external_owner_url" text,
  ADD COLUMN IF NOT EXISTS "claimed_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "source_url" text,
  ADD COLUMN IF NOT EXISTS "category_tags" text[] DEFAULT '{}'::text[] NOT NULL;

UPDATE "projects"
SET "submitted_by_id" = "owner_id"
WHERE "submitted_by_id" IS NULL;

ALTER TABLE "projects"
  ALTER COLUMN "submitted_by_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "projects_submitted_by_idx"
  ON "projects" ("submitted_by_id");

CREATE INDEX IF NOT EXISTS "projects_project_type_idx"
  ON "projects" ("project_type");

CREATE INDEX IF NOT EXISTS "projects_claimed_by_idx"
  ON "projects" ("claimed_by_id");

ALTER TABLE "project_revisions"
  ADD COLUMN IF NOT EXISTS "project_type" "project_type" DEFAULT 'owned' NOT NULL,
  ADD COLUMN IF NOT EXISTS "external_owner_name" varchar(160),
  ADD COLUMN IF NOT EXISTS "external_owner_url" text,
  ADD COLUMN IF NOT EXISTS "source_url" text,
  ADD COLUMN IF NOT EXISTS "category_tags" text[] DEFAULT '{}'::text[] NOT NULL;
