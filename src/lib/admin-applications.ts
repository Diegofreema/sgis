import { supabase } from "@/lib/supabase/client";
import { type ActionResult } from "@/lib/auth";
import { APPLICATION_SUPPORTING_DOCUMENTS } from "@/lib/application-documents";

/**
 * Admin applications list + detail — supabase-js via admin RLS. List with
 * period filter + search + pagination (legacy listApplications/countApplications);
 * detail + review/delete port the legacy applicant detail page + reviewApplication.
 */

const DOCUMENTS_BUCKET =
  (import.meta.env.VITE_STORAGE_BUCKET_DOCUMENTS as string | undefined) ?? "documents";

export type ApplicationRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationCode: string;
  intendedClass: string;
  status: string;
  createdAt: string;
};

export type ExamAttemptRow = {
  applicationId: string;
  status: string;
  score: string | null;
  totalMarks: number | null;
  passed: boolean | null;
  createdAt: string;
};

const APP_COLS =
  "id, firstName:first_name, lastName:last_name, email, applicationCode:application_code, intendedClass:intended_class, status, createdAt:created_at";

type Filters = { periodId?: string; q?: string; page?: number; pageSize?: number };

// supabase-js filter builders are awkward to type through a helper; accept the
// chainable builder loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, f?: Filters): any {
  let q = query;
  if (f?.periodId) q = q.eq("application_period_id", f.periodId);
  if (f?.q) {
    const t = f.q.replace(/[%,]/g, "");
    q = q.or(
      `first_name.ilike.%${t}%,last_name.ilike.%${t}%,email.ilike.%${t}%,application_code.ilike.%${t}%`,
    );
  }
  return q;
}

export async function countApplications(filters?: Filters): Promise<number> {
  const base = supabase.from("applications").select("id", { count: "exact", head: true });
  const { count, error } = await applyFilters(base, filters);
  if (error) throw error;
  return count ?? 0;
}

export async function listApplications(filters?: Filters): Promise<ApplicationRow[]> {
  const page = Math.max(filters?.page ?? 1, 1);
  const pageSize = filters?.pageSize ?? 20;
  const from = (page - 1) * pageSize;

  const base = supabase
    .from("applications")
    .select(APP_COLS)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  const { data, error } = await applyFilters(base, filters);
  if (error) throw error;
  return (data as unknown as ApplicationRow[]) ?? [];
}

// ─── Applicant detail + review (legacy applicants/[id] + reviewApplication) ──

export type ApplicationDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  intendedClass: string;
  previousSchool: string | null;
  address: string;
  state: string | null;
  lga: string | null;
  submittedAt: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  applicationCode: string;
  status: string;
  rejectionReason: string | null;
  receiptUrl: string | null;
  userId: string | null;
};

export type SupportingDoc = { label: string; url: string | null };

export type ApplicantExamAttempt = {
  attempt: {
    score: string | null;
    totalMarks: number | null;
    passed: boolean | null;
    status: string;
    submittedAt: string | null;
  };
  exam: { title: string; passingScore: number };
} | null;

export type ApplicationDetailData = {
  application: ApplicationDetail;
  supportingDocuments: SupportingDoc[];
  examAttempt: ApplicantExamAttempt;
};

const DETAIL_COLS =
  "id, firstName:first_name, lastName:last_name, email, phone, dateOfBirth:date_of_birth, gender, intendedClass:intended_class, previousSchool:previous_school, address, state, lga, submittedAt:submitted_at, guardianName:guardian_name, guardianPhone:guardian_phone, guardianEmail:guardian_email, applicationCode:application_code, status, rejectionReason:rejection_reason, receiptPath:receipt_path, receiptUrl:receipt_url, documentUrls:document_urls, userId:user_id";

// Signs a storage path for a 1h window (admin read on the documents bucket).
async function signDoc(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) {
    console.error("[storage sign]", error.message);
    return null;
  }
  return data.signedUrl;
}

export async function getApplicationById(id: string): Promise<ApplicationDetailData | null> {
  const { data, error } = await supabase
    .from("applications")
    .select(DETAIL_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;

  const receiptUrl = row.receiptPath ? await signDoc(row.receiptPath) : row.receiptUrl;
  const docPaths: (string | null)[] = Array.isArray(row.documentUrls) ? row.documentUrls : [];
  const supportingDocuments = await Promise.all(
    APPLICATION_SUPPORTING_DOCUMENTS.map(async (d, i) => ({
      label: d.label,
      url: await signDoc(docPaths[i] ?? null),
    })),
  );

  const { data: att } = await supabase
    .from("exam_attempts")
    .select(
      "score, totalMarks:total_marks, passed, status, submittedAt:submitted_at, exam:exams(title, passingScore:passing_score)",
    )
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let examAttempt: ApplicantExamAttempt = null;
  if (att) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = att as any;
    const exam = Array.isArray(a.exam) ? a.exam[0] : a.exam;
    if (exam) {
      examAttempt = {
        attempt: {
          score: a.score,
          totalMarks: a.totalMarks,
          passed: a.passed,
          status: a.status,
          submittedAt: a.submittedAt,
        },
        exam: { title: exam.title, passingScore: exam.passingScore },
      };
    }
  }

  const application: ApplicationDetail = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    intendedClass: row.intendedClass,
    previousSchool: row.previousSchool,
    address: row.address,
    state: row.state,
    lga: row.lga,
    submittedAt: row.submittedAt,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    guardianEmail: row.guardianEmail,
    applicationCode: row.applicationCode,
    status: row.status,
    rejectionReason: row.rejectionReason,
    receiptUrl,
    userId: row.userId,
  };

  return { application, supportingDocuments, examAttempt };
}

// Port of legacy reviewApplication. Runs through the `review-application` Edge
// Function (service role) so it can email the applicant via Resend — the status
// update, notes, reviewer stamp, and email all happen server-side. The function
// verifies the caller is an authenticated admin.
export async function reviewApplication(
  id: string,
  input: { status: "pending" | "approved" | "rejected"; rejectionReason?: string; notes?: string },
): Promise<ActionResult> {
  if (input.status === "rejected" && !input.rejectionReason?.trim()) {
    return { success: false, error: "Rejection reason is required." };
  }
  const { data, error } = await supabase.functions.invoke("review-application", {
    body: {
      applicationId: id,
      status: input.status,
      rejectionReason: input.rejectionReason,
      notes: input.notes,
    },
  });
  if (error) {
    // Edge errors carry the JSON body on the context for non-2xx responses.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctxBody = await (error as any)?.context?.json?.().catch(() => null);
    return { success: false, error: ctxBody?.error ?? error.message ?? "Could not update the application." };
  }
  if (data && data.success === false) {
    return { success: false, error: data.error ?? "Could not update the application." };
  }
  return { success: true, data: undefined };
}

// Hard-delete an application (not in legacy). Cleans up storage docs first,
// then exam attempts (exam_answers cascade from attempts; access sessions
// cascade from the application) — attempts have no FK cascade, so remove them
// explicitly or the application delete fails.
export async function deleteApplication(id: string): Promise<ActionResult> {
  const { data } = await supabase
    .from("applications")
    .select("receiptPath:receipt_path, documentUrls:document_urls")
    .eq("id", id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  const paths = [row?.receiptPath, ...(Array.isArray(row?.documentUrls) ? row.documentUrls : [])].filter(
    Boolean,
  ) as string[];
  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths);
    if (rmErr) console.error("[storage remove]", rmErr.message);
  }

  const { error: attErr } = await supabase.from("exam_attempts").delete().eq("application_id", id);
  if (attErr) return { success: false, error: attErr.message };

  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function listExamAttemptsByApplications(
  applicationIds: string[],
): Promise<ExamAttemptRow[]> {
  if (applicationIds.length === 0) return [];
  const { data, error } = await supabase
    .from("exam_attempts")
    .select(
      "applicationId:application_id, status, score, totalMarks:total_marks, passed, createdAt:created_at",
    )
    .in("application_id", applicationIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ExamAttemptRow[]) ?? [];
}
