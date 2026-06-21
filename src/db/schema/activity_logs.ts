import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles, userRoleEnum } from "./users";

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    actorRole: userRoleEnum("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorIdx: index("activity_logs_actor_id_idx").on(table.actorId),
    actionIdx: index("activity_logs_action_idx").on(table.action),
    createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
  })
);

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
