"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db, exams, questions, examQuestions, profiles, galleryItems, announcements, applicationPeriods } from "@/db";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { getAnnouncementLengthIssues } from "@/lib/announcements";
import {
  MAX_BULK_QUESTION_UPLOAD,
  validateQuestionBankInput,
} from "@/lib/question-bank";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuestionOptionDb } from "@/db/schema/exams";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const MAX_GALLERY_IMAGE_BYTES = 1024 * 1024;
const GALLERY_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type DetectedGalleryImageType =
  | { ext: "jpg"; mime: "image/jpeg" }
  | { ext: "png"; mime: "image/png" }
  | { ext: "webp"; mime: "image/webp" };

let galleryBucketChecked = false;

function galleryFileNameTitle(filename: string) {
  const cleaned = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return cleaned || "Gallery Photo";
}

function detectGalleryImageType(bytes: Uint8Array): DetectedGalleryImageType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

function getGalleryBucketName() {
  return process.env.NEXT_PUBLIC_STORAGE_BUCKET_GALLERY ?? "gallery";
}

function getGalleryObjectPath(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    const prefix = `/storage/v1/object/public/${getGalleryBucketName()}/`;
    if (!url.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

async function ensureGalleryBucket() {
  if (galleryBucketChecked) return;

  const supabase = createAdminClient();
  const bucket = getGalleryBucketName();
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (error) {
    if (error.message.toLowerCase().includes("not found")) {
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: MAX_GALLERY_IMAGE_BYTES,
        allowedMimeTypes: [...GALLERY_IMAGE_MIME_TYPES],
      });
      if (createError) throw new Error(createError.message);
    } else {
      throw new Error(error.message);
    }
  } else if (
    !data.public ||
    String(data.file_size_limit ?? "") !== String(MAX_GALLERY_IMAGE_BYTES) ||
    [...GALLERY_IMAGE_MIME_TYPES].some((mime) => !data.allowed_mime_types?.includes(mime))
  ) {
    const { error: updateError } = await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_GALLERY_IMAGE_BYTES,
      allowedMimeTypes: [...GALLERY_IMAGE_MIME_TYPES],
    });
    if (updateError) throw new Error(updateError.message);
  }

  galleryBucketChecked = true;
}

async function uploadGalleryImage(input: {
  bytes: Uint8Array;
  detectedType: DetectedGalleryImageType;
  filename: string;
}) {
  await ensureGalleryBucket();

  const supabase = createAdminClient();
  const bucket = getGalleryBucketName();
  const path = `gallery/${Date.now()}-${crypto.randomUUID()}-${galleryFileNameTitle(input.filename)
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()}.${input.detectedType.ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, input.bytes, {
    contentType: input.detectedType.mime,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

function revalidateGalleryPaths() {
  revalidateTag("gallery", "max");
  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/admin/gallery");
}

// ─── Exams ────────────────────────────────────────────────────────────────────

function revalidateExamPaths(examId?: string) {
  revalidatePath("/admin/exams");
  revalidatePath("/admin/question-bank");
  revalidatePath("/admin");
  revalidatePath("/dashboard/exam");
  revalidatePath("/dashboard/results");
  revalidatePath("/entrance-exam");
  revalidatePath("/entrance-exam/exam");
  if (examId) revalidatePath(`/admin/exams/${examId}`);
}

async function getApplicationPeriodForExam(periodId: string) {
  if (!db) return null;
  return db
    .select()
    .from(applicationPeriods)
    .where(eq(applicationPeriods.id, periodId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

async function syncExamTotalMarks(examId: string) {
  if (!db) return 0;

  const assigned = await db
    .select({
      marks: questions.marks,
    })
    .from(examQuestions)
    .innerJoin(questions, eq(examQuestions.questionId, questions.id))
    .where(eq(examQuestions.examId, examId));

  const totalMarks = Math.round(
    assigned.reduce((sum, row) => sum + Number(row.marks), 0)
  );

  await db
    .update(exams)
    .set({ totalMarks, updatedAt: new Date() })
    .where(eq(exams.id, examId));

  return totalMarks;
}

async function getAssignedQuestionIds(examId: string) {
  if (!db) return [];
  const rows = await db
    .select({ questionId: examQuestions.questionId })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId));
  return rows.map((row) => row.questionId);
}

export async function createExam(input: {
  title: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  passingScore: number;
  applicationPeriodId: string;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const period = await getApplicationPeriodForExam(input.applicationPeriodId);
  if (!period) {
    return { success: false, error: "Select a valid session for this exam." };
  }
  if (new Date(period.examEndDate) < new Date()) {
    return { success: false, error: "Past sessions cannot have new exams." };
  }

  const [exam] = await db
    .insert(exams)
    .values({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      instructions: input.instructions?.trim() || null,
      durationMinutes: input.durationMinutes,
      passingScore: input.passingScore,
      totalMarks: 0,
      randomizeQuestions: false,
      showResultImmediately: false,
      applicationPeriodId: input.applicationPeriodId,
      createdBy: admin.id,
    })
    .returning({ id: exams.id });

  revalidateExamPaths(exam.id);
  return { success: true, data: { id: exam.id } };
}

export async function updateExam(
  examId: string,
  input: {
    title?: string;
    description?: string;
    instructions?: string;
    durationMinutes?: number;
    passingScore?: number;
    applicationPeriodId?: string;
  }
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  if (input.applicationPeriodId) {
    const period = await getApplicationPeriodForExam(input.applicationPeriodId);
    if (!period) return { success: false, error: "Select a valid session for this exam." };
    if (new Date(period.examEndDate) < new Date()) {
      return { success: false, error: "Past sessions cannot be used for exams." };
    }
  }

  await db
    .update(exams)
    .set({
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description.trim() || null }),
      ...(input.instructions !== undefined && { instructions: input.instructions.trim() || null }),
      ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
      ...(input.passingScore !== undefined && { passingScore: input.passingScore }),
      ...(input.applicationPeriodId !== undefined && { applicationPeriodId: input.applicationPeriodId }),
      updatedAt: new Date(),
    })
    .where(eq(exams.id, examId));

  revalidateExamPaths(examId);
  return { success: true, data: undefined };
}

export async function updateExamWindow(input: {
  periodId: string;
  examStartDate: string;
  examEndDate: string;
}): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const period = await getApplicationPeriodForExam(input.periodId);
  if (!period) return { success: false, error: "Exam session not found." };

  const examStartDate = new Date(input.examStartDate);
  const examEndDate = new Date(input.examEndDate);
  if (
    Number.isNaN(examStartDate.getTime()) ||
    Number.isNaN(examEndDate.getTime())
  ) {
    return { success: false, error: "Enter valid exam date and time values." };
  }
  if (examStartDate >= examEndDate) {
    return { success: false, error: "Exam end time must be after the start time." };
  }

  await db
    .update(applicationPeriods)
    .set({
      examStartDate,
      examEndDate,
      updatedAt: new Date(),
    })
    .where(eq(applicationPeriods.id, input.periodId));

  revalidateExamPaths();
  revalidatePath("/admin/settings");
  return { success: true, data: undefined };
}

export async function updateExamStatus(
  examId: string,
  status: "draft" | "active" | "closed" | "archived"
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const currentExam = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!currentExam) return { success: false, error: "Exam not found." };

  if (status === "active") {
    const period = await getApplicationPeriodForExam(currentExam.applicationPeriodId);
    if (!period) return { success: false, error: "Exam session not found." };
    if (new Date(period.examEndDate) < new Date()) {
      return { success: false, error: "This session exam window has already passed." };
    }

    const assignedCount = await db
      .select({ questionId: examQuestions.questionId })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))
      .limit(1);
    if (!assignedCount[0]) {
      return { success: false, error: "Assign at least one question before activating this exam." };
    }

    await syncExamTotalMarks(examId);

    await db
      .update(exams)
      .set({ status: "closed", updatedAt: new Date() })
      .where(
        and(
          eq(exams.applicationPeriodId, currentExam.applicationPeriodId),
          eq(exams.status, "active"),
          ne(exams.id, examId)
        )
      );
  }

  await db
    .update(exams)
    .set({ status, updatedAt: new Date() })
    .where(eq(exams.id, examId));

  revalidateExamPaths(examId);
  return { success: true, data: undefined };
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function createQuestionBankItem(input: {
  questionText: string;
  questionImageUrl?: string;
  options: QuestionOptionDb[];
  correctOption: string;
  explanation?: string;
  marks?: number;
  difficulty?: "easy" | "medium" | "hard";
  subject?: string;
  sortOrder?: number;
}): Promise<ActionResult<{ id: string }>> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const validated = validateQuestionBankInput(input, {
    requireKnownSubject: true,
    fallbackSortOrder: input.sortOrder ?? 0,
  });
  if (!validated.success) {
    return { success: false, error: validated.error };
  }

  const [q] = await db
    .insert(questions)
    .values({
      examId: null,
      questionText: validated.data.questionText,
      questionImageUrl: input.questionImageUrl,
      options: validated.data.options,
      correctOption: validated.data.correctOption,
      explanation: validated.data.explanation,
      marks: validated.data.marks,
      difficulty: validated.data.difficulty,
      subject: validated.data.subject,
      sortOrder: validated.data.sortOrder,
    })
    .returning({ id: questions.id });

  revalidateExamPaths();
  return { success: true, data: { id: q.id } };
}

export async function updateQuestionBankItem(
  questionId: string,
  input: {
    questionText?: string;
    questionImageUrl?: string;
    options?: QuestionOptionDb[];
    correctOption?: string;
    explanation?: string;
    marks?: number;
    difficulty?: "easy" | "medium" | "hard";
    subject?: string;
    sortOrder?: number;
  }
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const existing = await db
    .select({
      questionText: questions.questionText,
      options: questions.options,
      correctOption: questions.correctOption,
      explanation: questions.explanation,
      marks: questions.marks,
      difficulty: questions.difficulty,
      subject: questions.subject,
      sortOrder: questions.sortOrder,
    })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return { success: false, error: "Question not found." };
  }

  const validated = validateQuestionBankInput(
    {
      questionText: input.questionText ?? existing.questionText,
      options: input.options ?? (existing.options as QuestionOptionDb[]),
      correctOption: input.correctOption ?? existing.correctOption,
      explanation: input.explanation ?? existing.explanation,
      marks: input.marks ?? existing.marks,
      difficulty: input.difficulty ?? existing.difficulty,
      subject: input.subject ?? existing.subject,
      sortOrder: input.sortOrder ?? existing.sortOrder,
    },
    {
      fallbackSortOrder: input.sortOrder ?? existing.sortOrder,
    }
  );

  if (!validated.success) {
    return { success: false, error: validated.error };
  }

  await db
    .update(questions)
    .set({
      questionText: validated.data.questionText,
      ...(input.questionImageUrl !== undefined && { questionImageUrl: input.questionImageUrl }),
      options: validated.data.options,
      correctOption: validated.data.correctOption,
      explanation: validated.data.explanation,
      marks: validated.data.marks,
      difficulty: validated.data.difficulty,
      subject: validated.data.subject,
      sortOrder: validated.data.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(questions.id, questionId));

  const affectedExams = await db
    .select({ examId: examQuestions.examId })
    .from(examQuestions)
    .where(eq(examQuestions.questionId, questionId));
  for (const row of affectedExams) {
    await syncExamTotalMarks(row.examId);
  }

  revalidateExamPaths();
  return { success: true, data: undefined };
}

export async function deleteQuestionBankItem(questionId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const affectedExams = await db
    .select({ examId: examQuestions.examId })
    .from(examQuestions)
    .where(eq(examQuestions.questionId, questionId));

  await db.delete(questions).where(eq(questions.id, questionId));

  for (const row of affectedExams) {
    await syncExamTotalMarks(row.examId);
  }

  revalidateExamPaths();
  return { success: true, data: undefined };
}

export async function bulkCreateQuestionBankItems(input: {
  questions: {
    questionText: string;
    options: QuestionOptionDb[];
    correctOption: string;
    explanation?: string;
    marks?: number;
    difficulty?: "easy" | "medium" | "hard";
    subject?: string;
    sortOrder?: number;
  }[];
}): Promise<ActionResult<{ created: number }>> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };
  if (input.questions.length === 0) {
    return { success: false, error: "No questions found in the file." };
  }
  if (input.questions.length > MAX_BULK_QUESTION_UPLOAD) {
    return {
      success: false,
      error: `Upload ${MAX_BULK_QUESTION_UPLOAD} questions or fewer at a time.`,
    };
  }

  const values = [];

  for (let index = 0; index < input.questions.length; index += 1) {
    const validated = validateQuestionBankInput(input.questions[index], {
      requireKnownSubject: true,
      fallbackSortOrder: index,
    });

    if (!validated.success) {
      return {
        success: false,
        error: `Row ${index + 2}: ${validated.error}`,
      };
    }

    values.push({
      examId: null,
      questionText: validated.data.questionText,
      options: validated.data.options,
      correctOption: validated.data.correctOption,
      explanation: validated.data.explanation,
      marks: validated.data.marks,
      difficulty: validated.data.difficulty,
      subject: validated.data.subject,
      sortOrder: validated.data.sortOrder,
    });
  }

  await db.insert(questions).values(values);

  revalidateExamPaths();
  return { success: true, data: { created: values.length } };
}

export async function assignQuestionsToExam(
  examId: string,
  questionIds: string[]
): Promise<ActionResult<{ assigned: number }>> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };
  if (questionIds.length === 0) return { success: true, data: { assigned: 0 } };

  const existingIds = new Set(await getAssignedQuestionIds(examId));
  const nextIds = [...new Set(questionIds)].filter((questionId) => !existingIds.has(questionId));

  if (nextIds.length === 0) {
    return { success: true, data: { assigned: 0 } };
  }

  const lastSortOrder = await db
    .select({ sortOrder: examQuestions.sortOrder })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(desc(examQuestions.sortOrder))
    .limit(1)
    .then((rows) => rows[0]?.sortOrder ?? -1);

  await db.insert(examQuestions).values(
    nextIds.map((questionId, index) => ({
      examId,
      questionId,
      sortOrder: lastSortOrder + index + 1,
    }))
  );

  await syncExamTotalMarks(examId);
  revalidateExamPaths(examId);
  return { success: true, data: { assigned: nextIds.length } };
}

export async function removeQuestionFromExam(
  examId: string,
  questionId: string
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .delete(examQuestions)
    .where(and(eq(examQuestions.examId, examId), eq(examQuestions.questionId, questionId)));

  await syncExamTotalMarks(examId);
  revalidateExamPaths(examId);
  return { success: true, data: undefined };
}

export async function randomlyAssignQuestionsToExam(input: {
  examId: string;
  count: number;
  subject?: string;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<ActionResult<{ assigned: number }>> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const allQuestions = await db.select().from(questions).orderBy(desc(questions.createdAt));
  const assignedIds = new Set(await getAssignedQuestionIds(input.examId));
  const candidates = allQuestions.filter((question) => {
    if (assignedIds.has(question.id)) return false;
    if (input.subject?.trim() && (question.subject ?? "") !== input.subject.trim()) return false;
    if (input.difficulty && question.difficulty !== input.difficulty) return false;
    return true;
  });

  const picked = [...candidates]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(0, input.count))
    .map((question) => question.id);

  const result = await assignQuestionsToExam(input.examId, picked);
  if (!result.success) return result;
  return { success: true, data: { assigned: result.data.assigned } };
}

export async function createQuestion(input: {
  examId: string;
  questionText: string;
  questionImageUrl?: string;
  options: QuestionOptionDb[];
  correctOption: string;
  explanation?: string;
  marks?: number;
  difficulty?: "easy" | "medium" | "hard";
  subject?: string;
  sortOrder?: number;
}): Promise<ActionResult<{ id: string }>> {
  const created = await createQuestionBankItem(input);
  if (!created.success) return created;
  const assigned = await assignQuestionsToExam(input.examId, [created.data.id]);
  if (!assigned.success) return assigned;
  return created;
}

export async function updateQuestion(
  questionId: string,
  input: {
    questionText?: string;
    questionImageUrl?: string;
    options?: QuestionOptionDb[];
    correctOption?: string;
    explanation?: string;
    marks?: number;
    difficulty?: "easy" | "medium" | "hard";
    subject?: string;
    sortOrder?: number;
  }
): Promise<ActionResult> {
  return updateQuestionBankItem(questionId, input);
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  return deleteQuestionBankItem(questionId);
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function updateUserRole(
  profileId: string,
  role: "student" | "parent" | "admin"
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(profiles)
    .set({ role, updatedAt: new Date() })
    .where(eq(profiles.id, profileId));

  return { success: true, data: undefined };
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

export async function createGalleryItems(
  formData: FormData
): Promise<ActionResult<{ items: typeof galleryItems.$inferSelect[] }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return { success: false, error: "Select at least one image." };

  const baseSortOrder = await db
    .select({ sortOrder: galleryItems.sortOrder })
    .from(galleryItems)
    .orderBy(desc(galleryItems.sortOrder))
    .limit(1)
    .then((rows) => rows[0]?.sortOrder ?? -1);

  const uploads = [];
  for (const file of files) {
    if (file.size > MAX_GALLERY_IMAGE_BYTES) {
      return { success: false, error: `${file.name} must be 1MB or smaller.` };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = detectGalleryImageType(bytes);
    if (!detectedType || !GALLERY_IMAGE_MIME_TYPES.has(detectedType.mime)) {
      return {
        success: false,
        error: `${file.name} must be a real JPG, PNG, or WebP image.`,
      };
    }

    uploads.push({
      file,
      bytes,
      detectedType,
    });
  }

  const createdItems = [];
  const createdItemIds: string[] = [];
  const uploadedPaths: string[] = [];
  try {
    for (const [index, upload] of uploads.entries()) {
      const image = await uploadGalleryImage({
        bytes: upload.bytes,
        detectedType: upload.detectedType,
        filename: upload.file.name,
      });
      uploadedPaths.push(image.path);

      const [item] = await db
        .insert(galleryItems)
        .values({
          imageUrl: image.url,
          title: galleryFileNameTitle(upload.file.name),
          description: null,
          category: null,
          visibility: "public",
          sortOrder: baseSortOrder + index + 1,
          createdBy: admin.id,
        })
        .returning();

      createdItems.push(item);
      createdItemIds.push(item.id);
    }
  } catch (error) {
    if (createdItemIds.length > 0) {
      try {
        await db.delete(galleryItems).where(inArray(galleryItems.id, createdItemIds));
      } catch {}
    }
    if (uploadedPaths.length > 0) {
      try {
        const supabase = createAdminClient();
        await supabase.storage.from(getGalleryBucketName()).remove(uploadedPaths);
      } catch {}
    }
    const message = error instanceof Error ? error.message : "Gallery upload failed.";
    return { success: false, error: message };
  }

  revalidateGalleryPaths();
  return { success: true, data: { items: createdItems } };
}

export async function deleteGalleryItem(itemId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const existing = await db
    .select({ imageUrl: galleryItems.imageUrl })
    .from(galleryItems)
    .where(eq(galleryItems.id, itemId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const path = existing ? getGalleryObjectPath(existing.imageUrl) : null;
  if (path) {
    try {
      await ensureGalleryBucket();
      const supabase = createAdminClient();
      const { error } = await supabase.storage.from(getGalleryBucketName()).remove([path]);
      if (error) throw new Error(error.message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove image file.",
      };
    }
  }

  await db.delete(galleryItems).where(eq(galleryItems.id, itemId));
  revalidateGalleryPaths();

  return { success: true, data: undefined };
}

// ─── Announcements ────────────────────────────────────────────────────────────

async function archiveOtherPublishedAnnouncements(exceptId?: string) {
  if (!db) return;

  await db
    .update(announcements)
    .set({
      status: "archived",
      updatedAt: new Date(),
    })
    .where(
      exceptId
        ? and(eq(announcements.status, "published"), ne(announcements.id, exceptId))
        : eq(announcements.status, "published")
    );
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  excerpt?: string;
  isImportant?: boolean;
  status?: "draft" | "published";
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };
  const lengthIssue = getAnnouncementLengthIssues(input)[0];
  if (lengthIssue) return { success: false, error: lengthIssue.message };

  const slugifyMod = await import("slugify");
  const slugify = slugifyMod.default ?? slugifyMod;
  const slug = (slugify as (s: string, o?: object) => string)(input.title, { lower: true, strict: true }) + "-" + Date.now();

  if (input.status === "published") {
    await archiveOtherPublishedAnnouncements();
  }

  const [ann] = await db
    .insert(announcements)
    .values({
      title: input.title,
      slug,
      body: input.body,
      excerpt: input.excerpt ?? null,
      audience: "public",
      isImportant: input.isImportant ?? false,
      status: input.status ?? "draft",
      publishedAt: input.status === "published" ? new Date() : null,
      createdBy: admin.id,
    })
    .returning({ id: announcements.id });

  revalidatePath("/");
  revalidatePath("/admin/announcements");

  return { success: true, data: { id: ann.id } };
}

export async function updateAnnouncement(
  id: string,
  input: {
    title?: string;
    body?: string;
    excerpt?: string;
    isImportant?: boolean;
    status?: "draft" | "published" | "archived";
  }
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };
  const lengthIssue = getAnnouncementLengthIssues(input)[0];
  if (lengthIssue) return { success: false, error: lengthIssue.message };

  if (input.status === "published") {
    await archiveOtherPublishedAnnouncements(id);
  }

  await db
    .update(announcements)
    .set({
      ...input,
      audience: "public",
      publishedAt: input.status === "published" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id));

  revalidatePath("/");
  revalidatePath("/admin/announcements");

  return { success: true, data: undefined };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const deleted = await db
    .delete(announcements)
    .where(eq(announcements.id, id))
    .returning({ id: announcements.id });

  if (deleted.length === 0) {
    return { success: false, error: "Announcement not found." };
  }

  revalidatePath("/");
  revalidatePath("/admin/announcements");

  return { success: true, data: undefined };
}
