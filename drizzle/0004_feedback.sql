CREATE TYPE "public"."feedback_kind" AS ENUM('question', 'bug', 'feature', 'feedback', 'other');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('new', 'read', 'done');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "feedback_kind" NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"email" text,
	"user_id" text,
	"context" jsonb,
	"ip_hash" text,
	"status" "feedback_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"chunks" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_media_chunks" (
	"media_id" integer NOT NULL,
	"idx" integer NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "feedback_media_chunks_media_id_idx_pk" PRIMARY KEY("media_id","idx")
);
--> statement-breakpoint
ALTER TABLE "feedback_media" ADD CONSTRAINT "feedback_media_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_media_chunks" ADD CONSTRAINT "feedback_media_chunks_media_id_feedback_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."feedback_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_created_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_ip_idx" ON "feedback" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "feedback_media_fb_idx" ON "feedback_media" USING btree ("feedback_id");