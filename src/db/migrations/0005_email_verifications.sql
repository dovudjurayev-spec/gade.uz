CREATE TABLE IF NOT EXISTS "email_verifications" (
  "id" serial PRIMARY KEY,
  "email" varchar(200) NOT NULL,
  "code_hash" varchar(128) NOT NULL,
  "name" varchar(200),
  "password_hash" text NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_verifications_email_idx" ON "email_verifications" ("email");
