import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  timezone: text("timezone").notNull().default("America/Toronto"),
  sendHour: integer("send_hour").notNull().default(7),
  active: boolean("active").notNull().default(true),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  createdAt: createdAt(),
});

export const magicLinks = pgTable(
  "magic_links",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("magic_links_user_idx").on(t.userId)],
);

export const topics = pgTable("topics", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["curated", "custom"] }).notNull(),
  /** Google News search query for custom topics; null for curated. */
  query: text("query"),
  accent: text("accent").notNull().default("#0F766E"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const topicFeeds = pgTable(
  "topic_feeds",
  {
    id: id(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("topic_feeds_topic_url_idx").on(t.topicId, t.url)],
);

export const userTopics = pgTable(
  "user_topics",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    /** How many stories to show for this topic (1..7). Default 5. */
    weight: integer("weight").notNull().default(5),
    followedAt: timestamp("followed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] })],
);

export const articles = pgTable(
  "articles",
  {
    id: id(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    urlHash: text("url_hash").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    source: text("source").notNull(),
    snippet: text("snippet"),
    imageUrl: text("image_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    clusterKey: text("cluster_key"),
    clusterSize: integer("cluster_size").notNull().default(1),
  },
  (t) => [
    uniqueIndex("articles_topic_url_idx").on(t.topicId, t.urlHash),
    index("articles_topic_published_idx").on(t.topicId, sql`${t.publishedAt} desc`),
  ],
);

export const digests = pgTable(
  "digests",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The user's local calendar date this digest belongs to, YYYY-MM-DD. */
    localDate: text("local_date").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status", { enum: ["sent", "failed", "skipped_empty"] }).notNull(),
    articleCount: integer("article_count").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
  },
  (t) => [uniqueIndex("digests_user_local_date_idx").on(t.userId, t.localDate)],
);

export const digestArticles = pgTable(
  "digest_articles",
  {
    digestId: uuid("digest_id")
      .notNull()
      .references(() => digests.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.digestId, t.articleId] })],
);

export const clicks = pgTable(
  "clicks",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clicks_user_time_idx").on(t.userId, t.clickedAt)],
);

export const feedback = pgTable("feedback", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  direction: text("direction", { enum: ["more", "less"] }).notNull(),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Digest = typeof digests.$inferSelect;
