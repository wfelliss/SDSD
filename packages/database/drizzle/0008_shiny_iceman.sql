
ALTER TABLE "runs" ADD COLUMN "lower_bound_idx" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "upper_bound_idx" integer;--> statement-breakpoint
UPDATE "runs" SET "upper_bound_idx" = "length" - 1;--> statement-breakpoint
ALTER TABLE "runs" ALTER COLUMN "upper_bound_idx" SET NOT NULL;