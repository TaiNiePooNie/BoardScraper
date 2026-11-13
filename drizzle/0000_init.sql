CREATE TYPE "public"."ambassador_confidence" AS ENUM('confirmed', 'likely');--> statement-breakpoint
CREATE TYPE "public"."board_profile" AS ENUM('camber', 'rocker', 'flat', 'hybrid-camber', 'hybrid-rocker', 'directional-camber');--> statement-breakpoint
CREATE TYPE "public"."board_shape" AS ENUM('true-twin', 'directional-twin', 'directional', 'tapered');--> statement-breakpoint
CREATE TYPE "public"."deal_tier" AS ENUM('extremely-good', 'very-good', 'good', 'normal', 'bad');--> statement-breakpoint
CREATE TYPE "public"."riding_style" AS ENUM('park', 'all-mountain', 'freeride');--> statement-breakpoint
CREATE TYPE "public"."waist_class" AS ENUM('regular', 'mid-wide', 'wide');--> statement-breakpoint
CREATE TABLE "board_ambassadors" (
	"board_id" integer NOT NULL,
	"rider_id" integer NOT NULL,
	"confidence" "ambassador_confidence" NOT NULL,
	"source_url" text,
	CONSTRAINT "board_ambassadors_board_id_rider_id_pk" PRIMARY KEY("board_id","rider_id")
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"season" text NOT NULL,
	"profile" "board_profile",
	"shape" "board_shape",
	"flex" integer,
	"styles" "riding_style"[] DEFAULT '{}' NOT NULL,
	"msrp_amount" numeric(10, 2),
	"msrp_currency" text,
	"images" text[] DEFAULT '{}' NOT NULL,
	"review_avg" real,
	"review_count" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_sizes" (
	"listing_id" integer NOT NULL,
	"label" text NOT NULL,
	"length_cm" integer NOT NULL,
	"waist" "waist_class" NOT NULL,
	"in_stock" boolean NOT NULL,
	"price" numeric(10, 2),
	CONSTRAINT "listing_sizes_listing_id_label_pk" PRIMARY KEY("listing_id","label")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"retailer_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"price_amount" numeric(10, 2) NOT NULL,
	"price_currency" text NOT NULL,
	"list_price" numeric(10, 2),
	"images" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_scraped_at" timestamp with time zone NOT NULL,
	"tier" "deal_tier",
	"score" integer
);
--> statement-breakpoint
CREATE TABLE "price_points" (
	"listing_id" integer NOT NULL,
	"date" date NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"in_stock" boolean NOT NULL,
	CONSTRAINT "price_points_listing_id_date_pk" PRIMARY KEY("listing_id","date")
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"homepage" text NOT NULL,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"prices_include_vat" boolean NOT NULL,
	"shipping" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_sources" (
	"board_id" integer NOT NULL,
	"source" text NOT NULL,
	"url" text,
	"average" real NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "review_sources_board_id_source_pk" PRIMARY KEY("board_id","source")
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"disciplines" "riding_style"[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"retailer_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"products_seen" integer DEFAULT 0 NOT NULL,
	"products_saved" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "board_ambassadors" ADD CONSTRAINT "board_ambassadors_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_ambassadors" ADD CONSTRAINT "board_ambassadors_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_sizes" ADD CONSTRAINT "listing_sizes_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_retailer_id_retailers_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."retailers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_points" ADD CONSTRAINT "price_points_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_sources" ADD CONSTRAINT "review_sources_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_key_uq" ON "boards" USING btree ("key");--> statement-breakpoint
CREATE INDEX "sizes_len_idx" ON "listing_sizes" USING btree ("length_cm","waist");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_url_uq" ON "listings" USING btree ("url");--> statement-breakpoint
CREATE INDEX "listings_tier_idx" ON "listings" USING btree ("tier","score");--> statement-breakpoint
CREATE INDEX "listings_board_idx" ON "listings" USING btree ("board_id");--> statement-breakpoint
CREATE UNIQUE INDEX "riders_name_uq" ON "riders" USING btree ("name");