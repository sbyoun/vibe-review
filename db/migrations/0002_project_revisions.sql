CREATE TABLE IF NOT EXISTS "project_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "actor_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "source" varchar(40) DEFAULT 'web_update' NOT NULL,
  "title" varchar(160) NOT NULL,
  "summary" text NOT NULL,
  "description" text,
  "status" "project_status" NOT NULL,
  "visibility" "project_visibility" NOT NULL,
  "demo_url" text,
  "repo_url" text,
  "cover_image_object_key" text,
  "cover_image_url" text,
  "tools" text[] DEFAULT '{}'::text[] NOT NULL,
  "feedback_focus" "feedback_type"[] DEFAULT '{}'::"feedback_type"[] NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_revisions_project_id_created_at_idx"
  ON "project_revisions" ("project_id", "created_at");

CREATE INDEX IF NOT EXISTS "project_revisions_actor_id_idx"
  ON "project_revisions" ("actor_id");
