"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Check,
  Loader2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  createQuestionBankItem,
  updateQuestionBankItem,
  deleteQuestionBankItem,
} from "@/server/actions/admin.actions";
import type { Question } from "@/db/schema/exams";
import { PRIMARY_SIX_SUBJECTS } from "@/lib/question-bank";

const OPTION_IDS = ["a", "b", "c", "d"] as const;

type QuestionEditorProps = {
  questions: Question[];
  readOnly?: boolean;
};

type QuestionDraft = {
  id?: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  subject: string;
  sortOrder: number;
  isOpen: boolean;
  isSaving: boolean;
};

function toQuestionDraft(q: Question, isOpen = false): QuestionDraft {
  return {
    id: q.id,
    questionText: q.questionText,
    options: (q.options as { id: string; text: string }[]) ?? [],
    correctOption: q.correctOption,
    explanation: q.explanation ?? "",
    marks: Number(q.marks),
    difficulty: q.difficulty,
    subject: q.subject ?? "",
    sortOrder: q.sortOrder,
    isOpen,
    isSaving: false,
  };
}

function emptyDraft(sortOrder: number): QuestionDraft {
  return {
    questionText: "",
    options: OPTION_IDS.map((id) => ({ id, text: "" })),
    correctOption: "a",
    explanation: "",
    marks: 1,
    difficulty: "medium",
    subject: "",
    sortOrder,
    isOpen: true,
    isSaving: false,
  };
}

export function QuestionEditor({ questions: initial, readOnly = false }: QuestionEditorProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() =>
    initial.length === 0 && !readOnly
      ? [emptyDraft(0)]
      : initial.map((q) => toQuestionDraft(q))
  );

  function update(index: number, patch: Partial<QuestionDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  }

  function setOption(index: number, optId: string, text: string) {
    setDrafts((prev) =>
      prev.map((d, i) =>
        i === index
          ? {
              ...d,
              options: d.options.map((o) =>
                o.id === optId ? { ...o, text } : o
              ),
            }
          : d
      )
    );
  }

  function addNewQuestion() {
    setDrafts((prev) => [...prev, emptyDraft(prev.length)]);
  }

  async function handleSave(index: number) {
    const draft = drafts[index];
    if (!draft.questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }
    if (!draft.subject.trim()) {
      toast.error("Select a subject.");
      return;
    }
    const emptyOption = draft.options.find((o) => !o.text.trim());
    if (emptyOption) {
      toast.error(`Option ${emptyOption.id.toUpperCase()} cannot be empty.`);
      return;
    }

    update(index, { isSaving: true });

    const payload = {
      questionText: draft.questionText,
      options: draft.options,
      correctOption: draft.correctOption,
      explanation: draft.explanation,
      marks: draft.marks,
      difficulty: draft.difficulty,
      subject: draft.subject || undefined,
      sortOrder: draft.sortOrder,
    };

    let result;
    if (draft.id) {
      result = await updateQuestionBankItem(draft.id, payload);
    } else {
      result = await createQuestionBankItem(payload);
    }

    if (result.success) {
      toast.success("Question saved.");
      if (!draft.id && "data" in result) {
        update(index, {
          id: (result.data as { id: string }).id,
          isSaving: false,
          isOpen: false,
        });
      } else {
        update(index, { isSaving: false, isOpen: false });
      }
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to save question.");
      update(index, { isSaving: false });
    }
  }

  async function handleDelete(index: number) {
    const draft = drafts[index];
    if (!draft.id) {
      setDrafts((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    update(index, { isSaving: true });
    const result = await deleteQuestionBankItem(draft.id);
    if (result.success) {
      setDrafts((prev) => prev.filter((_, i) => i !== index));
      toast.success("Question deleted.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete question.");
      update(index, { isSaving: false });
    }
  }

  const DIFF_COLORS: Record<string, string> = {
    easy: "bg-success/20 text-success",
    medium: "bg-warning/20 text-warning",
    hard: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="space-y-3">
      {drafts.map((draft, i) => (
        <Collapsible
          key={draft.id ?? `new-${i}`}
          open={draft.isOpen}
          onOpenChange={(open) => update(i, { isOpen: open })}
        >
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Question header */}
            <CollapsibleTrigger className="w-full text-left">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                  {i + 1}
                </span>
                <p className="flex-1 text-sm font-medium truncate min-w-0">
                  {draft.questionText || (
                    <span className="text-muted-foreground italic">
                      New question…
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {draft.difficulty && (
                    <Badge className={cn("text-[10px] px-1.5 py-0", DIFF_COLORS[draft.difficulty])}>
                      {draft.difficulty}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {draft.marks} mark{draft.marks !== 1 ? "s" : ""}
                  </span>
                  {draft.isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-t border-border px-4 py-4 space-y-4">
                {/* Question text */}
                <div className="space-y-1.5">
                  <Label>Question Text *</Label>
                  <Textarea
                    value={draft.questionText}
                    onChange={(e) =>
                      update(i, { questionText: e.target.value })
                    }
                    placeholder="Enter the question…"
                    rows={3}
                    disabled={readOnly}
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <Label>Options</Label>
                  {draft.options.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          !readOnly && update(i, { correctOption: opt.id })
                        }
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold uppercase transition-colors",
                          draft.correctOption === opt.id
                            ? "border-success bg-success/20 text-success"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                        title={`Set "${opt.id.toUpperCase()}" as correct answer`}
                        disabled={readOnly}
                      >
                        {draft.correctOption === opt.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          opt.id.toUpperCase()
                        )}
                      </button>
                      <Input
                        value={opt.text}
                        onChange={(e) =>
                          setOption(i, opt.id, e.target.value)
                        }
                        placeholder={`Option ${opt.id.toUpperCase()}…`}
                        disabled={readOnly}
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground">
                    Click the letter button to set the correct answer.
                  </p>
                </div>

                {/* Meta row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Marks</Label>
                    <Input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={draft.marks}
                      onChange={(e) =>
                        update(i, { marks: Number(e.target.value) })
                      }
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select
                      value={draft.difficulty}
                      onValueChange={(v: string) =>
                        update(i, { difficulty: v as "easy" | "medium" | "hard" })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject</Label>
                    <Select
                      value={draft.subject || "__none__"}
                      onValueChange={(value) =>
                        update(i, {
                          subject: value === "__none__" ? "" : value,
                        })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {draft.subject || "Select subject"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select subject</SelectItem>
                        {(
                          draft.subject &&
                          !PRIMARY_SIX_SUBJECTS.includes(
                            draft.subject as (typeof PRIMARY_SIX_SUBJECTS)[number]
                          )
                            ? [draft.subject, ...PRIMARY_SIX_SUBJECTS]
                            : PRIMARY_SIX_SUBJECTS
                        ).map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5">
                  <Label>
                    Explanation{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (shown after result)
                    </span>
                  </Label>
                  <Textarea
                    value={draft.explanation}
                    onChange={(e) =>
                      update(i, { explanation: e.target.value })
                    }
                    placeholder="Explain why the correct answer is correct…"
                    rows={2}
                    disabled={readOnly}
                  />
                </div>

                {/* Action row */}
                {!readOnly && (
                  <div className="flex justify-between pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(i)}
                      disabled={draft.isSaving}
                      className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(i)}
                      disabled={draft.isSaving}
                      className="gap-1.5"
                    >
                      {draft.isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save Question
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          onClick={addNewQuestion}
          className="w-full gap-1.5 border-dashed"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      )}
    </div>
  );
}
