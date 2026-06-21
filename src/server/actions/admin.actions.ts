"use server";

import { db, exams, questions, profiles, galleryItems, announcements } from "@/db";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import type { QuestionOptionDb } from "@/db/schema/exams";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Exams ────────────────────────────────────────────────────────────────────

export async function createExam(input: {
  title: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  totalMarks: number;
  passingScore: number;
  randomizeQuestions: boolean;
  showResultImmediately: boolean;
  applicationPeriodId?: string;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const [exam] = await db
    .insert(exams)
    .values({
      title: input.title,
      description: input.description,
      instructions: input.instructions,
      durationMinutes: input.durationMinutes,
      totalMarks: input.totalMarks,
      passingScore: input.passingScore,
      randomizeQuestions: input.randomizeQuestions,
      showResultImmediately: input.showResultImmediately,
      // Use a placeholder period id when not provided; admin should link later
      applicationPeriodId:
        input.applicationPeriodId ?? "00000000-0000-0000-0000-000000000000",
      createdBy: admin.id,
    })
    .returning({ id: exams.id });

  return { success: true, data: { id: exam.id } };
}

export async function updateExam(
  examId: string,
  input: {
    title?: string;
    description?: string;
    instructions?: string;
    durationMinutes?: number;
    totalMarks?: number;
    passingScore?: number;
    randomizeQuestions?: boolean;
    showResultImmediately?: boolean;
  }
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(exams)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(exams.id, examId));

  return { success: true, data: undefined };
}

export async function updateExamStatus(
  examId: string,
  status: "draft" | "active" | "closed" | "archived"
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(exams)
    .set({ status, updatedAt: new Date() })
    .where(eq(exams.id, examId));

  return { success: true, data: undefined };
}

// ─── Questions ────────────────────────────────────────────────────────────────

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
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const [q] = await db
    .insert(questions)
    .values({
      examId: input.examId,
      questionText: input.questionText,
      questionImageUrl: input.questionImageUrl,
      options: input.options,
      correctOption: input.correctOption,
      explanation: input.explanation,
      marks: String(input.marks ?? 1),
      difficulty: input.difficulty ?? "medium",
      subject: input.subject,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning({ id: questions.id });

  return { success: true, data: { id: q.id } };
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
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(questions)
    .set({
      ...(input.questionText !== undefined && { questionText: input.questionText }),
      ...(input.questionImageUrl !== undefined && { questionImageUrl: input.questionImageUrl }),
      ...(input.options !== undefined && { options: input.options }),
      ...(input.correctOption !== undefined && { correctOption: input.correctOption }),
      ...(input.explanation !== undefined && { explanation: input.explanation }),
      ...(input.marks !== undefined && { marks: String(input.marks) }),
      ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      updatedAt: new Date(),
    })
    .where(eq(questions.id, questionId));

  return { success: true, data: undefined };
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db.delete(questions).where(eq(questions.id, questionId));

  return { success: true, data: undefined };
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

export async function createGalleryItem(input: {
  imageUrl: string;
  title: string;
  description?: string;
  category?: string;
  visibility?: "public" | "private";
  sortOrder?: number;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const [item] = await db
    .insert(galleryItems)
    .values({
      imageUrl: input.imageUrl,
      title: input.title,
      description: input.description,
      category: input.category,
      visibility: input.visibility ?? "public",
      sortOrder: input.sortOrder ?? 0,
      createdBy: admin.id,
    })
    .returning({ id: galleryItems.id });

  return { success: true, data: { id: item.id } };
}

export async function deleteGalleryItem(itemId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db.delete(galleryItems).where(eq(galleryItems.id, itemId));

  return { success: true, data: undefined };
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function createAnnouncement(input: {
  title: string;
  body: string;
  excerpt?: string;
  audience: "public" | "students" | "parents" | "applicants" | "admins";
  isImportant?: boolean;
  status?: "draft" | "published";
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const slugifyMod = await import("slugify");
  const slugify = slugifyMod.default ?? slugifyMod;
  const slug = (slugify as (s: string, o?: object) => string)(input.title, { lower: true, strict: true }) + "-" + Date.now();

  const [ann] = await db
    .insert(announcements)
    .values({
      title: input.title,
      slug,
      body: input.body,
      excerpt: input.excerpt ?? null,
      audience: input.audience,
      isImportant: input.isImportant ?? false,
      status: input.status ?? "draft",
      publishedAt: input.status === "published" ? new Date() : null,
      createdBy: admin.id,
    })
    .returning({ id: announcements.id });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/announcements");

  return { success: true, data: { id: ann.id } };
}

export async function updateAnnouncement(
  id: string,
  input: {
    title?: string;
    body?: string;
    excerpt?: string;
    audience?: "public" | "students" | "parents" | "applicants" | "admins";
    isImportant?: boolean;
    status?: "draft" | "published" | "archived";
  }
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(announcements)
    .set({
      ...input,
      publishedAt: input.status === "published" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id));

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/announcements");

  return { success: true, data: undefined };
}
