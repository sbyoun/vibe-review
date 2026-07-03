CREATE TABLE IF NOT EXISTS "feedback_dismissals" (
  "feedback_id" uuid NOT NULL REFERENCES "feedback"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "dismissed_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("feedback_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "feedback_dismissals_user_id_idx"
  ON "feedback_dismissals" ("user_id");
