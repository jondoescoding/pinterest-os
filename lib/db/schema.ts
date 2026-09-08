import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch())`;

// A campaign groups content and targets exactly one Pinterest board (Postiz integration).
export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Postiz integration id for the target Pinterest board/account.
  boardIntegrationId: text("board_integration_id"),
  pinterestBoardId: text("pinterest_board_id"),
  boardName: text("board_name"),
  status: text("status").notNull().default("active"), // active | archived
  createdAt: integer("created_at").notNull().default(now),
});

// A single piece of generated content (image + copy), optionally tied to a campaign.
export const contentItems = sqliteTable("content_items", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").references(() => campaigns.id),
  title: text("title"),
  description: text("description"),
  destinationUrl: text("destination_url"),
  imageUrl: text("image_url"),
  // Provenance so the image-generation step is reproducible.
  imagePrompt: text("image_prompt"),
  falModel: text("fal_model"),
  state: text("state").notNull().default("draft"), // draft | scheduled | posted | failed
  createdAt: integer("created_at").notNull().default(now),
});

// Reusable generation preset. It can render as a settings-only editor, or with
// execution controls when a page wants to generate/save/schedule from it.
export const generationSets = sqliteTable("generation_sets", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").references(() => campaigns.id),
  name: text("name").notNull(),
  falModel: text("fal_model").notNull(),
  destinationUrl: text("destination_url"),
  scheduleStart: integer("schedule_start"),
  scheduleInterval: integer("schedule_interval").notNull().default(1),
  scheduleUnit: text("schedule_unit").notNull().default("days"), // minutes | hours | days
  scheduleAfterSave: integer("schedule_after_save", { mode: "boolean" })
    .notNull()
    .default(false),
  itemsJson: text("items_json").notNull().default("[]"),
  status: text("status").notNull().default("active"), // active | archived
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

// A scheduled publish of a content item to Postiz; mirrors Postiz's own scheduling.
export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  contentId: text("content_id")
    .notNull()
    .references(() => contentItems.id),
  postizPostId: text("postiz_post_id"),
  scheduledAt: integer("scheduled_at").notNull(),
  status: text("status").notNull().default("pending"), // pending | scheduled | posted | failed
  createdAt: integer("created_at").notNull().default(now),
});

// One durable claim per direct Postiz request. A pending claim is never
// automatically retried because Postiz may have accepted a request before a
// network interruption.
export const postizPublishRequests = sqliteTable("postiz_publish_requests", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  requestHash: text("request_hash").notNull(),
  status: text("status").notNull().default("pending"), // pending | complete | failed
  responseJson: text("response_json"),
  failureMessage: text("failure_message"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

// Small key/value settings store for app-level defaults that need to survive
// deploys and be editable from the internal UI.
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const fitSets = sqliteTable("sets", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  themeSlug: text("theme_slug").notNull(),
  title: text("title").notNull(),
  blurb: text("blurb").notNull(),
  collageUrl: text("collage_url"),
  status: text("status").notNull().default("draft"), // draft | published | failed
  pinId: text("pin_id"),
  publishedAt: integer("published_at"),
  productHash: text("product_hash").notNull().unique(),
  failureReason: text("failure_reason"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const fitSetItems = sqliteTable("set_items", {
  id: text("id").primaryKey(),
  setId: text("set_id")
    .notNull()
    .references(() => fitSets.id),
  slot: text("slot").notNull(),
  channel3ProductId: text("channel3_product_id").notNull(),
  title: text("title").notNull(),
  brand: text("brand"),
  price: real("price").notNull(),
  currency: text("currency").notNull(),
  buyUrl: text("buy_url").notNull(),
  imageUrl: text("image_url").notNull(),
  copy: text("copy").notNull(),
  position: integer("position").notNull(),
});

export const usedProducts = sqliteTable("used_products", {
  channel3ProductId: text("channel3_product_id").primaryKey(),
  lastUsedAt: integer("last_used_at").notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;
export type GenerationSet = typeof generationSets.$inferSelect;
export type NewGenerationSet = typeof generationSets.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type PostizPublishRequest = typeof postizPublishRequests.$inferSelect;
export type NewPostizPublishRequest = typeof postizPublishRequests.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
export type FitSet = typeof fitSets.$inferSelect;
export type NewFitSet = typeof fitSets.$inferInsert;
export type FitSetItem = typeof fitSetItems.$inferSelect;
export type NewFitSetItem = typeof fitSetItems.$inferInsert;
export type UsedProduct = typeof usedProducts.$inferSelect;
export type NewUsedProduct = typeof usedProducts.$inferInsert;
