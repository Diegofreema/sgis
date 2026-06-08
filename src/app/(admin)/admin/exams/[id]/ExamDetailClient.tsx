"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { createExam, updateExam, updateExamStatus } from "@/server/actions/admin.actions";
import { releaseResults } from "@/server/actions/exam.actions";
import type { Exam, Question } from "@/db/schema/exams";

type Props = {
  exam: Exam | null;
  questions: Question[];
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/20 text-success",
  closed: "bg-warning/20 text-warning",
  archived: "bg-destructive/20 text-destructive",
};

export function ExamDetailClient({ exam, questions: initialQuestions }: Props) {
  const router = useRouter();
  const isNew = !exam;

  const [title, setTitle] = useState(exam?.title ?? "");
  const [description, setDescription] = useState(exam?.description ?? "");
  const [instructions, setInstructions] = useState(exam?.instructions ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    exam?.durationMinutes ?? 60
  );
  const [totalMarks, setTotalMarks] = useState(exam?.totalMarks ?? 100);
  const [passingScore, setPassingScore] = useState(exam?.passingScore ?? 50);
  const [randomizeQuestions, setRandomizeQuestions] = useState(
    exam?.randomizeQuestions ?? false
  );
  const [showResultImmediately, setShowResultImmediately] = useState(
    exam?.showResultImmediately ?? false
  );
  const [saving, setSaving] = useState(false);
  const [releasingResults, setReleasingResults] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Exam title is required.");
      return;
    }
    setSaving(true);
    const payload = {
      title,
      description,
      instructions,
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks),
      passingScore: Number(passingScore),
      randomizeQuestions,
      showResultImmediately,
    };

    const result = isNew
      ? await createExam(payload)
      : await updateExam(exam.id, payload);

    setSaving(false);

    if (result.success) {
      toast.success(isNew ? "Exam created!" : "Exam updated.");
      if (isNew && "data" in result) {
        router.push(`/admin/exams/${(result.data as { id: string }).id}`);
      }
    } else {
      toast.error(result.error ?? "Failed to save exam.");
    }
  }

  async function handleStatusChange(newStatus: "draft" | "active" | "closed" | "archived") {
    if (!exam) return;
    const result = await updateExamStatus(exam.id, newStatus);
    if (result.success) {
      toast.success(`Exam marked as ${newStatus}.`);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update status.");
    }
  }

  async function handleReleaseResults() {
    if (!exam) return;
    setReleasingResults(true);
    const result = await releaseResults(exam.id);
    setReleasingResults(false);
    if (result.success) {
      toast.success("Results released to students.");
    } else {
      toast.error(result.error ?? "Failed to release results.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/exams")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-foreground truncate">
              {isNew ? "New Examination" : exam.title}
            </h1>
            {!isNew && (
              <Badge className={`mt-1 ${STATUS_COLORS[exam.status] ?? ""}`}>
                {exam.status}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isNew && exam.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("active")}
              className="gap-1.5 text-success border-success/30 hover:bg-success/10"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Activate
            </Button>
          )}
          {!isNew && exam.status === "active" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReleaseResults}
                disabled={releasingResults}
                className="gap-1.5"
              >
                {releasingResults ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Release Results
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("closed")}
                className="gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                Close Exam
              </Button>
            </>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 font-medium shadow-brand-sm"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isNew ? "Create Exam" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main config */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="exam-title">Title *</Label>
                <Input
                  id="exam-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 2025 Entrance Examination"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exam-desc">Description</Label>
                <Textarea
                  id="exam-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description shown to admin"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exam-instructions">
                  Student Instructions
                </Label>
                <Textarea
                  id="exam-instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Instructions shown to students before starting the exam…"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          {!isNew && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="font-serif text-base">
                    Questions
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {initialQuestions.length} question
                    {initialQuestions.length !== 1 ? "s" : ""} — {exam.totalMarks} total marks
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    router.push(`/admin/question-bank?examId=${exam.id}`)
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Questions
                </Button>
              </CardHeader>
              <CardContent>
                {initialQuestions.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No questions yet. Add questions from the question bank.
                    </p>
                  </div>
                ) : (
                  <QuestionEditor
                    examId={exam.id}
                    questions={initialQuestions}
                    readOnly={exam.status === "active"}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Settings sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total-marks">Total Marks</Label>
                <Input
                  id="total-marks"
                  type="number"
                  min={1}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passing-score">Passing Score</Label>
                <Input
                  id="passing-score"
                  type="number"
                  min={0}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Randomize Questions</p>
                  <p className="text-xs text-muted-foreground">
                    Different order per student
                  </p>
                </div>
                <Switch
                  checked={randomizeQuestions}
                  onCheckedChange={setRandomizeQuestions}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Instant Results</p>
                  <p className="text-xs text-muted-foreground">
                    Students see score on submit
                  </p>
                </div>
                <Switch
                  checked={showResultImmediately}
                  onCheckedChange={setShowResultImmediately}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
