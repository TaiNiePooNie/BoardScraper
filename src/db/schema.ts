import { relations } from "drizzle-orm";
import {
  boolean, customType, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, real, serial, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";
import type { BoardCategory, ShippingRule } from "@/lib/types";

export const sport = pgEnum("sport", ["snow", "skate", "surf"]);
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
  sport: sport("sport").notNull().default("snow"),
  /** Board type within the sport (BoardCategory); null when unknown. */
  category: text("category").$type<BoardCategory>(),
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
}, (t) => [uniqueIndex("boards_key_uq").on(t.key), index("boards_sport_idx").on(t.sport)]);

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
  /** Snow/surf length; skate deck length when known, else 0. */
  lengthCm: integer("length_cm").notNull(),
  waist: waistClass("waist").notNull(),
  inStock: boolean("in_stock").notNull(),
  price: money("price"),
  /** Skate: deck width (inches). */
  widthIn: real("width_in"),
  /** Surf: volume (litres). */
  volumeL: real("volume_l"),
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

/* ───────────────────────── Accounts (Better Auth core tables) ───────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("session_user_idx").on(t.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("account_user_idx").on(t.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

/* ───────────────────────── BoardBuddy user data ───────────────────────── */

/** Rider profiles ("buddies"), active buddy and held boards, synced from the app. */
export const userData = pgTable("user_data", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  buddies: jsonb("buddies").$type<unknown[]>().notNull().default([]),
  activeId: text("active_id"),
  holds: jsonb("holds").$type<string[]>().notNull().default([]),
  /** Ship-to country and currency last used in the app (for delivered prices in emails). */
  country: text("country"),
  currency: text("currency"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alertMode = pgEnum("alert_mode", ["weekly", "new-match"]);

/** Deal-alert email preferences (opt-in). */
export const alertPrefs = pgTable("alert_prefs", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  mode: alertMode("mode").notNull().default("weekly"),
  /** 0 = Sunday … 6 = Saturday (weekly mode). */
  weekday: integer("weekday").notNull().default(5),
  priceDrops: boolean("price_drops").notNull().default(true),
  /** Buddy ids to include; empty = all buddies. */
  buddyIds: jsonb("buddy_ids").$type<string[]>().notNull().default([]),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** What we already emailed, so alerts only show new boards or real price drops. */
export const alertLog = pgTable("alert_log", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.boardId] })]);

/* ───────────────────────── Feedback & support ───────────────────────── */

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const feedbackKind = pgEnum("feedback_kind", ["question", "bug", "feature", "feedback", "other"]);
export const feedbackStatus = pgEnum("feedback_status", ["new", "read", "done"]);

/** A message from the Feedback & support form. */
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  kind: feedbackKind("kind").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  /** Reply-to address (signed-in email or typed). */
  email: text("email"),
  userId: text("user_id"),
  /** Page, device, app state the sender agreed to include. */
  context: jsonb("context").$type<Record<string, unknown>>(),
  /** Salted hash of the sender's IP, for rate limiting only. */
  ipHash: text("ip_hash"),
  status: feedbackStatus("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("feedback_created_idx").on(t.createdAt), index("feedback_ip_idx").on(t.ipHash, t.createdAt)]);

/** Screenshot or video attached to a feedback message (stored in chunks: serverless bodies are small). */
export const feedbackMedia = pgTable("feedback_media", {
  id: serial("id").primaryKey(),
  feedbackId: integer("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  chunks: integer("chunks").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("feedback_media_fb_idx").on(t.feedbackId)]);

export const feedbackMediaChunks = pgTable("feedback_media_chunks", {
  mediaId: integer("media_id").notNull().references(() => feedbackMedia.id, { onDelete: "cascade" }),
  idx: integer("idx").notNull(),
  data: bytea("data").notNull(),
}, (t) => [primaryKey({ columns: [t.mediaId, t.idx] })]);
