export const PAYMENT_STATUS = {
  PENDING: "pending",       // created, awaiting user to submit proof
  SUBMITTED: "submitted",   // user submitted proof, awaiting admin review
  APPROVED: "approved",     // admin approved
  REJECTED: "rejected",     // admin rejected proof
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_PURPOSE = {
  ENTRANCE_EXAM_REGISTRATION: "entrance_exam_registration",
  SCHOOL_FEES: "school_fees",
  ADMISSION_FEE: "admission_fee",
  OTHER: "other",
} as const;

export type PaymentPurpose = (typeof PAYMENT_PURPOSE)[keyof typeof PAYMENT_PURPOSE];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Awaiting Proof",
  submitted: "Proof Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

export const PAYMENT_PURPOSE_LABELS: Record<PaymentPurpose, string> = {
  entrance_exam_registration: "Entrance Exam Registration",
  school_fees: "School Fees",
  admission_fee: "Admission Fee",
  other: "Other",
};

/** Statuses that block creating a duplicate payment record */
export const ACTIVE_PAYMENT_STATUSES: PaymentStatus[] = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.SUBMITTED,
  PAYMENT_STATUS.APPROVED,
];
