CREATE TYPE "public"."sport" AS ENUM('snow', 'skate', 'surf');--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "sport" "sport" DEFAULT 'snow' NOT NULL;--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "listing_sizes" ADD COLUMN "width_in" real;--> statement-breakpoint
ALTER TABLE "listing_sizes" ADD COLUMN "volume_l" real;--> statement-breakpoint
CREATE INDEX "boards_sport_idx" ON "boards" USING btree ("sport");