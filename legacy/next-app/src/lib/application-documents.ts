export const APPLICATION_DOCUMENT_MAX_BYTES = 500 * 1024;
export const APPLICATION_DOCUMENT_MAX_SIZE_LABEL = "500KB";

export const APPLICATION_DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
export const APPLICATION_PASSPORT_ACCEPT = "image/jpeg,image/png,image/webp";

export const APPLICATION_SUPPORTING_DOCUMENTS = [
  {
    key: "completedSchoolEntranceForm",
    label: "Completed school entrance form",
    kind: "completed-school-entrance-form",
    accept: APPLICATION_DOCUMENT_ACCEPT,
    allowPdf: true,
  },
  {
    key: "passportOne",
    label: "Passport photograph 1",
    kind: "passport-1",
    accept: APPLICATION_PASSPORT_ACCEPT,
    allowPdf: false,
  },
  {
    key: "passportTwo",
    label: "Passport photograph 2",
    kind: "passport-2",
    accept: APPLICATION_PASSPORT_ACCEPT,
    allowPdf: false,
  },
  {
    key: "birthCertificate",
    label: "Birth certificate",
    kind: "birth-certificate",
    accept: APPLICATION_DOCUMENT_ACCEPT,
    allowPdf: true,
  },
  {
    key: "medicalFitnessReport",
    label: "Medical fitness report / certificate",
    kind: "medical-fitness-report",
    accept: APPLICATION_DOCUMENT_ACCEPT,
    allowPdf: true,
  },
] as const;

export type ApplicationSupportingDocument =
  (typeof APPLICATION_SUPPORTING_DOCUMENTS)[number];
