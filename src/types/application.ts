import type { ApplicationStatus, ApplicationPeriodStatus } from "@/constants/statuses";

export type ApplicationPeriod = {
  id: string;
  title: string;
  description: string | null;
  applicationStartDate: string;
  applicationEndDate: string;
  examStartDate: string;
  examEndDate: string;
  registrationFee: number;
  currency: string;
  eligibleClasses: string[];
  status: ApplicationPeriodStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Application = {
  id: string;
  userId: string;
  applicationPeriodId: string;
  intendedClass: string;
  previousSchool: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  status: ApplicationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationWithPeriod = Application & {
  period: ApplicationPeriod;
};
