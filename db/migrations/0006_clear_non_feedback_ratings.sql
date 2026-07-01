UPDATE "feedback"
SET "rating" = NULL
WHERE "kind" <> 'feedback'
  AND "rating" IS NOT NULL;
