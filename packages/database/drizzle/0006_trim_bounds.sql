ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "lower_bound_idx" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "upper_bound_idx" integer;
--> statement-breakpoint
UPDATE "runs"
SET
  "upper_bound_idx" = GREATEST("length" - 1, 0)
WHERE "upper_bound_idx" IS NULL;
--> statement-breakpoint
ALTER TABLE "runs" ALTER COLUMN "upper_bound_idx" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "runs" ALTER COLUMN "upper_bound_idx" DROP DEFAULT;
