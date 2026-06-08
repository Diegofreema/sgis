import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { applications } from "./applications";

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",     // payment record created, awaiting user to submit proof
  "submitted",   // user submitted proof of payment, awaiting admin review
  "approved",    // admin approved the payment
  "rejected",    // admin rejected the proof
]);

export const paymentPurposeEnum = pgEnum("payment_purpose", [
  "entrance_exam_registration",
  "school_fees",
  "admission_fee",
  "other",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    applicationId: uuid("application_id").references(() => applications.id),
    purpose: paymentPurposeEnum("purpose").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("NGN"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    reference: text("reference").notNull().unique(),
    // User-submitted proof fields
    transactionRef: text("transaction_ref"),       // user's bank transaction reference / receipt number
    proofOfPaymentUrl: text("proof_of_payment_url"), // uploaded receipt screenshot (Supabase storage URL)
    proofNote: text("proof_note"),                 // user's description of payment
    // Admin fields
    adminNote: text("admin_note"),                 // admin's comment when approving or rejecting
    approvedBy: uuid("approved_by").references(() => profiles.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("payments_user_id_idx").on(table.userId),
    referenceIdx: index("payments_reference_idx").on(table.reference),
    statusIdx: index("payments_status_idx").on(table.status),
    purposeIdx: index("payments_purpose_idx").on(table.purpose),
  })
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
