import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { profiles } from "./users";

/**
 * Bank accounts managed by admin.
 * Users see active bank accounts on the Payments page and
 * use these details to make manual bank transfers.
 */
export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bankName: text("bank_name").notNull(),
    accountName: text("account_name").notNull(),
    accountNumber: text("account_number").notNull(),
    sortCode: text("sort_code"),       // optional — UK / international
    swiftCode: text("swift_code"),     // optional — for international transfers
    routingNumber: text("routing_number"), // optional — US
    iban: text("iban"),                // optional — EU / international
    currency: text("currency").notNull().default("NGN"),
    notes: text("notes"),              // any extra instructions shown to the user
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    isActiveIdx: index("bank_accounts_is_active_idx").on(table.isActive),
  })
);

export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
