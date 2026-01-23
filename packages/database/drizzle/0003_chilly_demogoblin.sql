ALTER TABLE "runs" ALTER COLUMN "src_path" SET DATA TYPE varchar(1024);--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_src_path_unique" UNIQUE("src_path");