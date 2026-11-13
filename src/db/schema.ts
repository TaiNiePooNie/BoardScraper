import { relations } from "drizzle-orm";
import {
  boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, real, serial, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";
import type { ShippingRule } from "@/lib/types";

export const ridingStyle = pgEnum("riding_style", ["park", "all-mountain", "freeride"]);
export const boardProfile = pgEnum("board_profile", ["camber", "rocker", "flat", "hybrid-camber", "hybrid-rocker", "directional-camber"]);
export const boardShape = pgEnum("board_shape", ["true-twin", "directional-twin", "directional", "tapered"]);
export const waistClass = pgEnum("waist_class", ["regular", "mid-wide", "wide"]);
export const dealTier = pgEnum("deal_tier", ["extremely-good", "very-good", "good", "normal", "bad"]);
export const ambassadorConfidence = pgEnum("ambassador_confidence", ["confirmed", "likely"]);

const money = (name: string) => numeric(name, { precision: 10, scale: 2, mode: "number" });

export const retailers = pgTable("retailers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  homepage: text("homepage").notNull(),
  country: text("country").notNull(),
  currency: text("currency").notNull(),
  pricesIncludeVat: boolean("prices_include_vat").notNull(),
  shipping: jsonb("shipping").$type<ShippingRule[]>().notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

/** Canonical model, shared across retailers. Key = normalized brand + model + season. */
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  season: text("season").notNull(),
  profile: boardProfile("profile"),
  shape: boardShape("shape"),
  flex: integer("flex"),
  styles: ridingStyle("styles").array().notNull().default([]),
  msrpAmount: money("msrp_amount"),
  msrpCurrency: text("msrp_currency"),
  images: text("images").array().notNull().default([]),
  reviewAvg: real("review_avg"),
  reviewCount: integer("review_count"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("boards_key_uq").on(t.key)]);

export const riders = pgTable("riders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  disciplines: ridingStyle("disciplines").array().notNull().default([]),
}, (t) => [uniqueIndex("riders_name_uq").on(t.name)]);

export const boardAmbassadors = pgTable("board_ambassadors", {
  boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  riderId: integer("rider_id").notNull().references(() => riders.id, { onDelete: "cascade" }),
  confidence: ambassadorConfidence("confidence").notNull(),
  sourceUrl: text("source_url"),
}, (t) => [primaryKey({ columns: [t.boardId, t.riderId] })]);

/** Per-retailer rating for a board (aggregated into boards.review_*). */
export const reviewSources = pgTable("review_sources", {
  boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  url: text("url"),
  average: real("average").notNull(),
  count: integer("count").notNull(),
}, (t) => [primaryKey({ columns: [t.boardId, t.source] })]);

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull().references(() => boards.id),
  retailerId: text("retailer_id").notNull().references(() => retailers.id),
  url: text("url").notNull(),
  title: text("title").notNull(),
  priceAmount: money("price_amount").notNull(),
  priceCurrency: text("price_currency").notNull(),
  listPrice: money("list_price"),
  images: text("images").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }).notNull(),
  // Denormalized grade, recomputed on ingest for fast tier queries.
  tier: dealTier("tier"),
  score: integer("score"),
}, (t) => [uniqueIndex("listings_url_uq").on(t.url), index("listings_tier_idx").on(t.tier, t.score), index("listings_board_idx").on(t.boardId)]);

export const listingSizes = pgTable("listing_sizes", {
  listingId: integer("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  lengthCm: integer("length_cm").notNull(),
  waist: waistClass("waist").notNull(),
  inStock: boolean("in_stock").notNull(),
  price: money("price"),
}, (t) => [primaryKey({ columns: [t.listingId, t.label] }), index("sizes_len_idx").on(t.lengthCm, t.waist)]);

/** One point per listing per day (lowest price seen that day). */
export const pricePoints = pgTable("price_points", {
  listingId: integer("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  price: money("price").notNull(),
  inStock: boolean("in_stock").notNull(),
}, (t) => [primaryKey({ columns: [t.listingId, t.date] })]);

export const scrapeRuns = pgTable("scrape_runs", {
  id: serial("id").primaryKey(),
  retailerId: text("retailer_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"), // running | ok | blocked | error
  productsSeen: integer("products_seen").notNull().default(0),
  productsSaved: integer("products_saved").notNull().default(0),
  error: text("error"),
});

export const boardsRelations = relations(boards, ({ many }) => ({ listings: many(listings), ambassadors: many(boardAmbassadors) }));
export const listingsRelations = relations(listings, ({ one, many }) => ({
  board: one(boards, { fields: [listings.boardId], references: [boards.id] }),
  retailer: one(retailers, { fields: [listings.retailerId], references: [retailers.id] }),
  sizes: many(listingSizes),
  history: many(pricePoints),
}));
export const listingSizesRelations = relations(listingSizes, ({ one }) => ({ listing: one(listings, { fields: [listingSizes.listingId], references: [listings.id] }) }));
export const pricePointsRelations = relations(pricePoints, ({ one }) => ({ listing: one(listings, { fields: [pricePoints.listingId], references: [listings.id] }) }));
export const boardAmbassadorsRelations = relations(boardAmbassadors, ({ one }) => ({
  board: one(boards, { fields: [boardAmbassadors.boardId], references: [boards.id] }),
  rider: one(riders, { fields: [boardAmbassadors.riderId], references: [riders.id] }),
}));
