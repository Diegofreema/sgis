"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import type { Question } from "@/db/schema/exams";

type Props = {
  exams: { id: string; title: string; status: string }[];
  questions: Question[];
  selectedExamId?: string;
};

export function QuestionBankClient({ exams, questions, selectedExamId }: Props) {
  const router = useRouter();

  function handleExamChange(examId: string) {
    if (!examId) return;
    router.push(`/admin/question-bank?examId=${examId}`);
  }

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Question Bank
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add and manage exam questions. Select an exam to get started.
        </p>
      </div>

      {/* Exam selector */}
      <div className="flex items-end gap-4">
        <div className="space-y-1.5 w-80">
          <Label>Select Exam</Label>
          <Select
            value={selectedExamId ?? ""}
            onValueChange={handleExamChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose an exam…" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.title}
                  {exam.status === "active" && " (active)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedExam && (
          <p className="text-xs text-muted-foreground pb-2">
            {questions.length} question{questions.length !== 1 ? "s" : ""} in
            this exam
          </p>
        )}
      </div>

      {/* Editor */}
      {!selectedExamId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-foreground">Select an exam above</p>
          <p className="text-sm text-muted-foreground mt-1">
            Questions are organised per examination.
          </p>
        </div>
      ) : (
        <QuestionEditor
          examId={selectedExamId}
          questions={questions}
          readOnly={selectedExam?.status === "active"}
        />
      )}

      {selectedExam?.status === "active" && (
        <p className="text-xs text-muted-foreground text-center">
          ⚠️ This exam is active — questions are read-only. Close the exam
          first to edit.
        </p>
      )}
    </div>
  );
}
