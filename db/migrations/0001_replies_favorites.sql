ALTER TABLE "feedback"
  ADD COLUMN IF NOT EXISTS "parent_feedback_id" uuid REFERENCES "feedback"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "feedback_parent_feedback_id_idx"
  ON "feedback" ("parent_feedback_id");

CREATE TABLE IF NOT EXISTS "project_favorites" (
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("project_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "project_favorites_user_id_idx"
  ON "project_favorites" ("user_id");

CREATE INDEX IF NOT EXISTS "project_favorites_project_id_idx"
  ON "project_favorites" ("project_id");
