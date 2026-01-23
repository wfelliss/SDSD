CREATE TABLE IF NOT EXISTS "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"front_min" integer DEFAULT 0 NOT NULL,
	"front_max" integer DEFAULT 4096 NOT NULL,
	"back_min" integer DEFAULT 0 NOT NULL,
	"back_max" integer DEFAULT 4096 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "profile" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "runs" ADD CONSTRAINT "runs_profile_profiles_id_fk" FOREIGN KEY ("profile") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
