DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_visibility') THEN
    CREATE TYPE "feedback_visibility" AS ENUM ('public', 'private');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_kind') THEN
    CREATE TYPE "feedback_kind" AS ENUM ('feedback', 'self_note', 'todo', 'decision', 'update', 'release');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_action_status') THEN
    CREATE TYPE "feedback_action_status" AS ENUM ('none', 'open', 'doing', 'done', 'dropped');
  END IF;
END $$;

ALTER TABLE "feedback"
  ADD COLUMN IF NOT EXISTS "visibility" "feedback_visibility" DEFAULT 'public' NOT NULL,
  ADD COLUMN IF NOT EXISTS "kind" "feedback_kind" DEFAULT 'feedback' NOT NULL,
  ADD COLUMN IF NOT EXISTS "action_status" "feedback_action_status" DEFAULT 'none' NOT NULL;

CREATE INDEX IF NOT EXISTS "feedback_visibility_idx"
  ON "feedback" ("visibility");

CREATE INDEX IF NOT EXISTS "feedback_kind_idx"
  ON "feedback" ("kind");

CREATE INDEX IF NOT EXISTS "feedback_action_status_idx"
  ON "feedback" ("action_status");
