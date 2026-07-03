CREATE TABLE IF NOT EXISTS "project_ownership_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "claimant_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "note" text,
  "evidence_url" text,
  "resolved_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_ownership_claims_project_status_idx"
  ON "project_ownership_claims" ("project_id", "status");

CREATE INDEX IF NOT EXISTS "project_ownership_claims_claimant_status_idx"
  ON "project_ownership_claims" ("claimant_id", "status");
