CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"role_slug" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone_number" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"step_reached" text,
	"status" text DEFAULT 'partial' NOT NULL,
	"disqualified_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"meta_event_sent_at" timestamp with time zone,
	"meta_event_detail" text,
	"landing_url" text,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fbc" text,
	"fbp" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"role_slug" text,
	"path" text NOT NULL,
	"referrer" text,
	"landing_url" text,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"country" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "applications_session_idx" ON "applications" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "applications_role_idx" ON "applications" USING btree ("role_slug","created_at");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "visits_created_idx" ON "visits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "visits_role_idx" ON "visits" USING btree ("role_slug","created_at");