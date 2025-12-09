CREATE TABLE IF NOT EXISTS "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"front_min" integer DEFAULT 0 NOT NULL,
	"front_max" integer DEFAULT 1024 NOT NULL,
	"back_min" integer DEFAULT 0 NOT NULL,
	"back_max" integer DEFAULT 1024 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"src_path" varchar(1024) NOT NULL,
	"title" varchar(255),
	"comments" text,
	"length" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"location" varchar(255),
	"profile" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "runs_src_path_unique" UNIQUE("src_path")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "runs" ADD CONSTRAINT "runs_profile_profiles_id_fk" FOREIGN KEY ("profile") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
