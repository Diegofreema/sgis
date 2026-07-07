"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExamResultAnswer } from "@/server/queries/exams.queries";

type Props = {
  applicationCode: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  passingScore: number;
  passed: boolean;
  answers: ExamResultAnswer[];
};

export function ExamResultClient({
  applicationCode,
  examTitle,
  score,
  totalMarks,
  passingScore,
  passed,
  answers,
}: Props) {
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const unansweredCount = answers.filter((a) => a.selectedOption == null).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <Button asChild className="mb-6" size="sm" variant="ghost">
        <Link
          href={`/entrance-exam?applicationId=${encodeURIComponent(applicationCode)}#status`}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to status
        </Link>
      </Button>

      <div className="mb-6 space-y-1">
        <p className="text-sm text-muted-foreground">Exam result</p>
        <h1 className="font-serif text-2xl font-bold text-foreground">{examTitle}</h1>
      </div>

      {/* Result banner */}
      <Card className="mb-8">
        <CardContent className="flex flex-col items-center gap-4 p-6 md:flex-row md:items-start">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${
              passed ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            {passed ? (
              <Award className="h-10 w-10" />
            ) : (
              <XCircle className="h-10 w-10" />
            )}
          </div>

          <div className="flex-1 space-y-3 text-center md:text-left">
            <div>
              <Badge variant={passed ? "default" : "destructive"} className="text-sm">
                {passed ? "Passed" : "Not passed"}
              </Badge>
              <p className="mt-1 text-sm text-muted-foreground">
                Passing: {passingScore}%
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:justify-start">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">{score}</p>
                <p className="text-xs text-muted-foreground">of {totalMarks} marks</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">{percentage}%</p>
                <p className="text-xs text-muted-foreground">Percentage</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">{correctCount}</p>
                <p className="text-xs text-muted-foreground">of {answers.length} correct</p>
              </div>
              {unansweredCount > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums text-muted-foreground">
                    {unansweredCount}
                  </p>
                  <p className="text-xs text-muted-foreground">unanswered</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question breakdown */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-serif text-lg font-semibold text-foreground">Question breakdown</h2>
        </div>

        <div className="space-y-2">
          {answers.map((answer, index) => {
            const selectedKey = answer.selectedOption;
            const selectedText = selectedKey
              ? answer.options.find((o) => o.id === selectedKey)?.text
              : null;

            return (
              <Card key={answer.questionId}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {answer.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Question {index + 1}
                          {answer.marksAwarded != null && (
                            <span className="ml-2">
                              ({Number(answer.marksAwarded)}/{Number(answer.marks)} marks)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-foreground">{answer.questionText}</p>
                      </div>

                      <div className="space-y-1">
                        {answer.options.map((option) => {
                          const isSelected = option.id === selectedKey;

                          return (
                            <div
                              key={option.id}
                              className={`rounded-md border px-3 py-1.5 text-sm ${
                                isSelected
                                  ? answer.isCorrect
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-red-300 bg-red-50 text-red-800"
                                  : "border-border bg-background text-muted-foreground"
                              }`}
                            >
                              <span className="font-medium">{option.id.toUpperCase()}.</span>{" "}
                              {option.text}
                              {isSelected && (
                                <span className="ml-1 text-xs">
                                  {answer.isCorrect ? "(Correct)" : "(Your answer)"}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {selectedText == null && (
                          <p className="text-xs italic text-muted-foreground">
                            Not answered
                          </p>
                        )}
                      </div>

                      {answer.explanation && (
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Explanation
                          </p>
                          <p className="text-sm text-foreground">{answer.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
