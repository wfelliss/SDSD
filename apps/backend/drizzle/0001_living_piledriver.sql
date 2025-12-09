CREATE TABLE IF NOT EXISTS "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"src_path" text NOT NULL,
	"comments" text,
	"length" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"location" varchar(255),
	"created_at" timestamp DEFAULT now()
);
