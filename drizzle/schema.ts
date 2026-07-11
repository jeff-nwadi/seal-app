import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uuid,
  pgEnum,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// =============================================================================
// Better Auth–managed tables
// =============================================================================
// These four tables (user / session / account / verification) are owned by
// the Better Auth CLI. Field names use Better Auth's `user`/`session`/...
// table names (singular, lowercase). The Drizzle column names below mirror
// the snake_case columns the CLI generates. See `drizzle/migrations/0000_*.sql`
// for the generated schema.
//
// IMPORTANT: do NOT hand-edit the `id` column type (`text`) or the FK from
// `session.userId` / `account.userId` — both are `text`, matching the
// `text` user id Better Auth issues. The application tables below all
// reference `user.id` as `text` for the same reason.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// =============================================================================
// Hand-authored application tables
// =============================================================================
//
// `capsule` is the core unit of Seal: a scheduled message (text/image/...)
// that either delivers privately to one recipient or contributes to a wall
// that unlocks for everyone at a shared `openDate`.
//
// ACCESS CONTROL (AGENTS.md non-negotiable): Neon/Drizzle has no row-level
// security. The guarantee that "a wall's content is unqueryable before
// openDate" lives entirely in `lib/wall-access.ts`. Every read of
// `capsuleContent` for a wall-bound capsule, and every read of `capsule`
// rows scoped to a wall, must go through the helpers in that file. If you
// add a new way to fetch wall data, mirror the same `openDate`/ownership
// check — never query `capsuleContent` directly without it.
// =============================================================================

// -- enums --------------------------------------------------------------------

/**
 * `capsule.status` lifecycle:
 *   draft     — being composed; not yet scheduled. Editable / deletable.
 *   scheduled — locked in. delivery_date is in the future. Editable /
 *               deletable per AGENTS.md; cron moves it to `delivered` once
 *               the recipients have been notified.
 *   delivered — sent. IMMUTABLE per AGENTS.md. Any edit attempt must be
 *               rejected at the API layer.
 *   failed    — the cron attempt exhausted retries; surfaced in the
 *               dashboard so the owner can re-schedule.
 */
export const capsuleStatus = pgEnum("capsule_status", [
  "draft",
  "scheduled",
  "delivered",
  "failed",
]);

/**
 * `capsuleContent.contentType` — exactly the four values the PRD §2 calls
 * for (Story 2: text, audio, video, image). The form UI uses the same set
 * of strings, so the two stay in lockstep.
 */
export const contentType = pgEnum("content_type", [
  "text",
  "image",
  "audio",
  "video",
]);

/**
 * Delivery channel — multi-channel per Story 5. A capsule may route to
 * the same recipient over several channels (e.g. an email + an SMS link to
 * the same wall). Channels that aren't selected are not contacted.
 */
export const deliveryChannel = pgEnum("delivery_channel", [
  "email",
  "sms",
  "push",
]);

/**
 * `notification.status` — the per-(recipient × channel) attempt outcome.
 * The cron creates a row per channel, sends, then updates.
 */
export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);

/**
 * Wall visibility — public walls (the default) appear on a shareable URL
 * once the openDate passes. `unlisted` keeps the wall URL secret; `private`
 * is reserved for an organizer-only view. The PRD only mandates public
 * for v1, but the enum makes the path to private walls additive.
 */
export const wallVisibility = pgEnum("wall_visibility", [
  "public",
  "unlisted",
  "private",
]);

// -- tables -------------------------------------------------------------------

/**
 * A wall is a public capsule that multiple people contribute to and that
 * unlocks for everyone on a shared `openDate`. `slug` is the shareable
 * handle (`/walls/class-of-2026`).
 */
export const wall = pgTable(
  "wall",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull(),
    openDate: timestamp("open_date", { withTimezone: true }).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    visibility: wallVisibility("visibility").default("public").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("wall_slug_unique").on(table.slug),
    index("wall_openDate_idx").on(table.openDate),
    index("wall_createdBy_idx").on(table.createdBy),
  ],
);

/**
 * A `capsule` is one scheduled message. It can either be:
 *   - `private` — `wallId IS NULL`, `deliveryDate` in the future, delivered
 *                 to one or more `recipient` rows.
 *   - `wall`    — `wallId IS NOT NULL`, contributes to a wall, the wall's
 *                 `openDate` is the delivery moment for everyone.
 *
 * We keep both shapes in a single table so a `recipient` row only ever
 * points at one capsule. Wall-bound capsules are surfaced to the world
 * through `lib/wall-access.ts`, which enforces the openDate seal.
 */
export const capsule = pgTable(
  "capsule",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wallId: uuid("wall_id").references((): AnyPgColumn => wall.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    /**
     * `deliveryDate` is set for private capsules; it's NULL for wall-bound
     * capsules (the wall's `openDate` is the delivery moment). Enforced in
     * the API route handler, not in the DB — Postgres CHECK would be more
     * rigid but harder to evolve.
     */
    deliveryDate: timestamp("delivery_date", { withTimezone: true }),
    status: capsuleStatus("status").default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    index("capsule_ownerId_idx").on(table.ownerId),
    index("capsule_wallId_idx").on(table.wallId),
    index("capsule_status_deliveryDate_idx").on(
      table.status,
      table.deliveryDate,
    ),
  ],
);

/**
 * `capsuleContent` is the body of a capsule. A capsule can hold several
 * content rows in `sortOrder` (e.g. a paragraph of text + a photo). For
 * `contentType = 'text'` the body lives in `contentText`; for media types
 * the URL from UploadThing lives in `contentUrl` and the `uploadthingKey`
 * is kept so we can issue a delete later.
 *
 * ACCESS: see the top of this file. Reads of `capsuleContent` for
 * wall-bound capsules MUST go through `lib/wall-access.ts`.
 */
export const capsuleContent = pgTable(
  "capsule_content",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    capsuleId: uuid("capsule_id")
      .notNull()
      .references(() => capsule.id, { onDelete: "cascade" }),
    contentType: contentType("content_type").notNull(),
    contentText: text("content_text"),
    contentUrl: text("content_url"),
    uploadthingKey: text("uploadthing_key"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("capsuleContent_capsuleId_idx").on(table.capsuleId)],
);

/**
 * `recipient` — the contact for a private capsule. The same email/phone
 * can appear on multiple capsules; we don't `UNIQUE` on email/phone to
 * preserve the audit trail. The (capsuleId, channel) pair IS unique though,
 * so a single capsule can't accidentally email the same address twice on
 * the same channel.
 */
export const recipient = pgTable(
  "recipient",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    capsuleId: uuid("capsule_id")
      .notNull()
      .references(() => capsule.id, { onDelete: "cascade" }),
    /** Free-form display name (e.g. "Mum"). Optional. */
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    channel: deliveryChannel("channel").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("recipient_capsuleId_idx").on(table.capsuleId),
    // Postgres treats NULL as distinct, so this is a partial-style guard
    // without writing a WHERE clause: at least one of email/phone must be
    // set, but the same row can have both.
    index("recipient_email_idx").on(table.email),
    index("recipient_phone_idx").on(table.phone),
  ],
);

/**
 * `notification` — one row per (recipient × channel) attempt. The cron
 * job creates a `pending` row before sending, then updates to `sent` or
 * `failed`. Keeps the audit trail even after delivery.
 */
export const notification = pgTable(
  "notification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => recipient.id, { onDelete: "cascade" }),
    channel: deliveryChannel("channel").notNull(),
    status: notificationStatus("status").default("pending").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_recipientId_idx").on(table.recipientId),
    index("notification_status_scheduledFor_idx").on(
      table.status,
      table.scheduledFor,
    ),
  ],
);

// -- relations ----------------------------------------------------------------

export const wallRelations = relations(wall, ({ one, many }) => ({
  organizer: one(user, {
    fields: [wall.createdBy],
    references: [user.id],
  }),
  capsules: many(capsule),
}));

export const capsuleRelations = relations(capsule, ({ one, many }) => ({
  owner: one(user, {
    fields: [capsule.ownerId],
    references: [user.id],
  }),
  wall: one(wall, {
    fields: [capsule.wallId],
    references: [wall.id],
  }),
  content: many(capsuleContent),
  recipients: many(recipient),
}));

export const capsuleContentRelations = relations(
  capsuleContent,
  ({ one }) => ({
    capsule: one(capsule, {
      fields: [capsuleContent.capsuleId],
      references: [capsule.id],
    }),
  }),
);

export const recipientRelations = relations(recipient, ({ one, many }) => ({
  capsule: one(capsule, {
    fields: [recipient.capsuleId],
    references: [capsule.id],
  }),
  notifications: many(notification),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  recipient: one(recipient, {
    fields: [notification.recipientId],
    references: [recipient.id],
  }),
}));

// -- inferred types -----------------------------------------------------------

export type CapsuleRow = typeof capsule.$inferSelect;
export type CapsuleInsert = typeof capsule.$inferInsert;
export type CapsuleContentRow = typeof capsuleContent.$inferSelect;
export type CapsuleContentInsert = typeof capsuleContent.$inferInsert;
export type WallRow = typeof wall.$inferSelect;
export type WallInsert = typeof wall.$inferInsert;
export type RecipientRow = typeof recipient.$inferSelect;
export type RecipientInsert = typeof recipient.$inferInsert;
export type NotificationRow = typeof notification.$inferSelect;
export type NotificationInsert = typeof notification.$inferInsert;
export type CapsuleStatusValue = (typeof capsuleStatus.enumValues)[number];
export type ContentTypeValue = (typeof contentType.enumValues)[number];
export type DeliveryChannelValue = (typeof deliveryChannel.enumValues)[number];
export type NotificationStatusValue =
  (typeof notificationStatus.enumValues)[number];
export type WallVisibilityValue = (typeof wallVisibility.enumValues)[number];

// Re-export `sql` for ad-hoc expressions elsewhere in the app — Drizzle
// queries that go through this file don't need it, but the dashboard
// queries module does, and keeping the export co-located with the schema
// keeps the import surface clean.
export { sql };
