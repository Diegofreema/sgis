import type { PaymentStatus, PaymentPurpose } from "@/constants/payment";

export type Payment = {
  id: string;
  userId: string;
  applicationId: string | null;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string;
  // User proof fields
  transactionRef: string | null;
  proofOfPaymentUrl: string | null;
  proofNote: string | null;
  // Admin fields
  adminNote: string | null;
  approvedBy: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string | null;
  swiftCode: string | null;
  routingNumber: string | null;
  iban: string | null;
  currency: string;
  notes: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SubmitPaymentProofPayload = {
  paymentId: string;
  transactionRef?: string;
  proofOfPaymentUrl?: string;
  proofNote?: string;
};
