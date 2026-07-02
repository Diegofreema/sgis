'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Archive,
  BookOpen,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Save,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  assignQuestionsToExam,
  createExam,
  randomlyAssignQuestionsToExam,
  removeQuestionFromExam,
  updateExam,
  updateExamWindow,
  updateExamStatus,
} from '@/server/actions/admin.actions';
import {
  releaseResults,
  sendBulkResultEmails,
} from '@/server/actions/exam.actions';
import { formatDate } from '@/lib/utils';
import type { ApplicationPeriod } from '@/db/schema/applications';
import type { Exam, Question } from '@/db/schema/exams';

type Props = {
  exam: Exam | null;
  questions: Question[];
  sessions: ApplicationPeriod[];
  questionBank: Question[];
};

type PendingAction =
  | 'active'
  | 'closed'
  | 'archived'
  | 'release-results'
  | 'email-results';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/20 text-success',
  closed: 'bg-warning/20 text-warning',
  archived: 'bg-destructive/20 text-destructive',
};

function questionPreview(question: Question) {
  return question.questionText.length > 90
    ? `${question.questionText.slice(0, 90)}...`
    : question.questionText;
}

function formatDateTimeInput(date: string | Date) {
  return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
}

export function ExamDetailClient({
  exam,
  questions: assignedQuestions,
  sessions,
  questionBank,
}: Props) {
  const router = useRouter();
  const isNew = !exam;

  const [title, setTitle] = useState(exam?.title ?? '');
  const [description, setDescription] = useState(exam?.description ?? '');
  const [instructions, setInstructions] = useState(exam?.instructions ?? '');
  const [durationMinutes, setDurationMinutes] = useState(
    exam?.durationMinutes ?? 60,
  );
  const [passingScore, setPassingScore] = useState(exam?.passingScore ?? 50);
  const [applicationPeriodId, setApplicationPeriodId] = useState(
    exam?.applicationPeriodId ?? '',
  );
  const [examStartDate, setExamStartDate] = useState(() => {
    const session = sessions.find(
      (item) => item.id === exam?.applicationPeriodId,
    );
    return session ? formatDateTimeInput(session.examStartDate) : '';
  });
  const [examEndDate, setExamEndDate] = useState(() => {
    const session = sessions.find(
      (item) => item.id === exam?.applicationPeriodId,
    );
    return session ? formatDateTimeInput(session.examEndDate) : '';
  });
  const [saving, setSaving] = useState(false);
  const [sendingResults, setSendingResults] = useState(false);
  const [releasingResults, setReleasingResults] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removingQuestionId, setRemovingQuestionId] = useState<string | null>(
    null,
  );
  const [randomCount, setRandomCount] = useState(10);
  const [randomSubject, setRandomSubject] = useState('');
  const [randomDifficulty, setRandomDifficulty] = useState<
    '' | 'easy' | 'medium' | 'hard'
  >('');
  const [randomizing, setRandomizing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const selectedSession =
    sessions.find((session) => session.id === applicationPeriodId) ?? null;
  const selectedSessionLabel = selectedSession?.title ?? 'Select session';
  const assignedIds = useMemo(
    () => new Set(assignedQuestions.map((question) => question.id)),
    [assignedQuestions],
  );
  const totalMarks = assignedQuestions.reduce(
    (sum, question) => sum + Number(question.marks),
    0,
  );
  const availableQuestions = useMemo(() => {
    const q = questionSearch.trim().toLowerCase();
    return questionBank.filter((question) => {
      if (assignedIds.has(question.id)) return false;
      if (!q) return true;
      return [
        question.questionText,
        question.subject ?? '',
        ...question.options.map((option) => option.text),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [assignedIds, questionBank, questionSearch]);
  const subjectOptions = [
    ...new Set(
      questionBank
        .map((question) => question.subject?.trim())
        .filter(Boolean) as string[],
    ),
  ].sort();

  useEffect(() => {
    const setStateToDefault = () => {
      setExamStartDate('');
      setExamEndDate('');
    };
    if (!selectedSession) {
      setStateToDefault();
      return;
    }
    const setExamDate = () => {
      setExamStartDate(formatDateTimeInput(selectedSession.examStartDate));
      setExamEndDate(formatDateTimeInput(selectedSession.examEndDate));
    };

    setExamDate();
  }, [selectedSession?.id, selectedSession]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Exam title is required.');
      return;
    }
    if (!applicationPeriodId) {
      toast.error('Select the session for this exam.');
      return;
    }

    setSaving(true);

    if (!isNew && selectedSession) {
      const scheduleChanged =
        examStartDate !== formatDateTimeInput(selectedSession.examStartDate) ||
        examEndDate !== formatDateTimeInput(selectedSession.examEndDate);

      if (scheduleChanged) {
        const scheduleResult = await updateExamWindow({
          periodId: selectedSession.id,
          examStartDate,
          examEndDate,
        });

        if (!scheduleResult.success) {
          setSaving(false);
          toast.error(
            scheduleResult.error ?? 'Failed to update exam schedule.',
          );
          return;
        }
      }
    }

    const payload = {
      title: title.trim(),
      description,
      instructions,
      durationMinutes: Number(durationMinutes),
      passingScore: Number(passingScore),
      applicationPeriodId,
    };

    const result = isNew
      ? await createExam(payload)
      : await updateExam(exam.id, payload);

    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? 'Failed to save exam.');
      return;
    }

    toast.success(isNew ? 'Exam created.' : 'Exam updated.');
    if (isNew) {
      router.push(`/admin/exams/${(result.data as { id: string }).id}`);
    } else {
      router.refresh();
    }
  }

  async function handleStatusChange(
    status: 'draft' | 'active' | 'closed' | 'archived',
  ) {
    if (!exam) return;
    setStatusUpdating(true);
    const result = await updateExamStatus(exam.id, status);
    setStatusUpdating(false);
    if (!result.success) {
      toast.error(result.error ?? 'Could not update exam status.');
      return;
    }
    toast.success(`Exam marked as ${status}.`);
    router.refresh();
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;

    const action = pendingAction;
    if (action === 'active' || action === 'closed' || action === 'archived') {
      await handleStatusChange(action);
    } else if (action === 'release-results') {
      await handleReleaseResults();
    } else {
      await handleSendResults();
    }

    setPendingAction(null);
  }

  async function handleAssignQuestion() {
    if (!exam || !selectedQuestionId) return;
    setAssigning(true);
    const result = await assignQuestionsToExam(exam.id, [selectedQuestionId]);
    setAssigning(false);
    if (!result.success) {
      toast.error(result.error ?? 'Could not assign question.');
      return;
    }
    setSelectedQuestionId('');
    toast.success(
      result.data.assigned > 0
        ? 'Question added to exam.'
        : 'Question already assigned.',
    );
    router.refresh();
  }

  async function handleRemoveQuestion(questionId: string) {
    if (!exam) return;
    setRemovingQuestionId(questionId);
    const result = await removeQuestionFromExam(exam.id, questionId);
    setRemovingQuestionId(null);
    if (!result.success) {
      toast.error(result.error ?? 'Could not remove question.');
      return;
    }
    toast.success('Question removed from exam.');
    router.refresh();
  }

  async function handleRandomAdd() {
    if (!exam) return;
    setRandomizing(true);
    const result = await randomlyAssignQuestionsToExam({
      examId: exam.id,
      count: Number(randomCount),
      subject: randomSubject || undefined,
      difficulty: randomDifficulty || undefined,
    });
    setRandomizing(false);
    if (!result.success) {
      toast.error(result.error ?? 'Could not add random questions.');
      return;
    }
    toast.success(
      result.data.assigned > 0
        ? `${result.data.assigned} question${result.data.assigned === 1 ? '' : 's'} added.`
        : 'No matching unassigned questions were available.',
    );
    router.refresh();
  }

  async function handleReleaseResults() {
    if (!exam) return;
    setReleasingResults(true);
    const result = await releaseResults(exam.id);
    setReleasingResults(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to release results.');
      return;
    }
    toast.success('Results released.');
  }

  async function handleSendResults() {
    if (!exam) return;
    setSendingResults(true);
    const result = await sendBulkResultEmails(exam.id);
    setSendingResults(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to send result emails.');
      return;
    }
    toast.success(
      `Sent ${result.data.sent} result email${result.data.sent === 1 ? '' : 's'}.`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/exams')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">
              {isNew ? 'Create Session Exam' : exam.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!isNew && (
                <Badge className={STATUS_COLORS[exam.status] ?? ''}>
                  {exam.status}
                </Badge>
              )}
              {selectedSession && (
                <Badge variant="outline">{selectedSession.title}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isNew && exam.status === 'draft' && (
            <Button
              variant="outline"
              onClick={() => setPendingAction('active')}
              disabled={statusUpdating}
              className="cursor-pointer"
            >
              Activate Exam
            </Button>
          )}
          {!isNew && exam.status === 'active' && (
            <>
              <Button
                variant="outline"
                onClick={() => setPendingAction('release-results')}
                disabled={releasingResults}
                className="gap-2 cursor-pointer"
              >
                {releasingResults ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Release Results
              </Button>
              <Button
                variant="outline"
                onClick={() => setPendingAction('email-results')}
                disabled={sendingResults}
                className="gap-2 cursor-pointer"
              >
                {sendingResults ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Email Results
              </Button>
              <Button
                variant="outline"
                onClick={() => setPendingAction('closed')}
                disabled={statusUpdating}
                className="gap-2 cursor-pointer"
              >
                <Archive className="h-4 w-4" />
                Close
              </Button>
            </>
          )}
          {!isNew && exam.status === 'closed' && (
            <Button
              variant="outline"
              onClick={() => setPendingAction('active')}
              disabled={statusUpdating}
              className="gap-2 cursor-pointer"
            >
              Reopen Exam
            </Button>
          )}
          {!isNew && exam.status !== 'archived' && exam.status !== 'active' && (
            <Button
              variant="outline"
              onClick={() => setPendingAction('archived')}
              disabled={statusUpdating}
              className="gap-2 cursor-pointer"
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 font-medium shadow-brand-sm cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isNew ? 'Create Exam' : 'Save Exam'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Exam Details
              </CardTitle>
              <CardDescription className="text-xs">
                Link this exam to one session and set the pass threshold
                applicants must meet.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="exam-title">Exam title</Label>
                <Input
                  id="exam-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. 2026 Common Entrance Examination"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Session</Label>
                <Select
                  value={applicationPeriodId || 'none'}
                  onValueChange={(value) =>
                    setApplicationPeriodId(value === 'none' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue>{selectedSessionLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select session</SelectItem>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={300}
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(Number(event.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pass-score">Pass threshold (%)</Label>
                <Input
                  id="pass-score"
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(event) =>
                    setPassingScore(Number(event.target.value))
                  }
                />
              </div>
              {!isNew && selectedSession && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-start-date">Exam starts</Label>
                    <Input
                      id="exam-start-date"
                      type="datetime-local"
                      value={examStartDate}
                      onChange={(event) => setExamStartDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exam-end-date">Exam ends</Label>
                    <Input
                      id="exam-end-date"
                      type="datetime-local"
                      value={examEndDate}
                      onChange={(event) => setExamEndDate(event.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    This updates the exam window for the selected session.
                  </p>
                </>
              )}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="exam-description">Admin description</Label>
                <Textarea
                  id="exam-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  placeholder="Short note for internal context"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="exam-instructions">
                  Applicant instructions
                </Label>
                <Textarea
                  id="exam-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  rows={5}
                  placeholder="Explain how applicants should take the exam."
                />
              </div>
            </CardContent>
          </Card>

          {!isNew && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-base">
                    Assign Questions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Add from the reusable bank one by one or let the system pull
                    a random set for this exam.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor="question-search">Search bank</Label>
                      <Input
                        id="question-search"
                        value={questionSearch}
                        onChange={(event) =>
                          setQuestionSearch(event.target.value)
                        }
                        placeholder="Search reusable questions"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pick question</Label>
                      <Select
                        value={selectedQuestionId || 'none'}
                        onValueChange={(value) =>
                          setSelectedQuestionId(value === 'none' ? '' : value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder="Choose question"
                            className="w-full"
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Choose question</SelectItem>
                          {availableQuestions.slice(0, 50).map((question) => (
                            <SelectItem key={question.id} value={question.id}>
                              {questionPreview(question)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="self-end gap-2"
                      onClick={handleAssignQuestion}
                      disabled={assigning || !selectedQuestionId}
                    >
                      {assigning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add
                    </Button>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-[0.8fr_1fr_1fr_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor="random-count">Random count</Label>
                      <Input
                        id="random-count"
                        type="number"
                        min={1}
                        value={randomCount}
                        onChange={(event) =>
                          setRandomCount(Number(event.target.value))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Subject filter</Label>
                      <Select
                        value={randomSubject || 'all'}
                        onValueChange={(value) =>
                          setRandomSubject(value === 'all' ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any subject</SelectItem>
                          {subjectOptions.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Difficulty filter</Label>
                      <Select
                        value={randomDifficulty || 'all'}
                        onValueChange={(value) =>
                          setRandomDifficulty(
                            value === 'all'
                              ? ''
                              : (value as typeof randomDifficulty),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any level</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      className="self-end gap-2"
                      onClick={handleRandomAdd}
                      disabled={randomizing || randomCount < 1}
                    >
                      {randomizing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Shuffle className="h-4 w-4" />
                      )}
                      Random add
                    </Button>
                  </div>

                  <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    Need a brand-new question? Build it in the{' '}
                    <Link
                      href="/admin/question-bank"
                      className="font-medium text-primary hover:underline"
                    >
                      Question Bank
                    </Link>
                    , then come back here to assign it.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-base">
                    Assigned Questions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Applicants all get this same question set, but each attempt
                    is shuffled individually.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignedQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
                      <BookOpen className="mb-4 h-9 w-9 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">
                        No questions assigned yet
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add bank questions before activating this exam.
                      </p>
                    </div>
                  ) : (
                    assignedQuestions.map((question, index) => (
                      <div
                        key={question.id}
                        className="rounded-xl border bg-card p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">#{index + 1}</Badge>
                              {question.subject && (
                                <Badge variant="outline">
                                  {question.subject}
                                </Badge>
                              )}
                              <Badge variant="outline" className="capitalize">
                                {question.difficulty}
                              </Badge>
                              <Badge variant="outline">
                                {Number(question.marks)} mark
                                {Number(question.marks) === 1 ? '' : 's'}
                              </Badge>
                            </div>
                            <p className="font-medium text-foreground">
                              {question.questionText}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleRemoveQuestion(question.id)}
                            disabled={
                              removingQuestionId === question.id ||
                              exam.status === 'active'
                            }
                          >
                            {removingQuestionId === question.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Exam Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Assigned Questions
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {assignedQuestions.length}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Marks
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {totalMarks}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Clock3 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {durationMinutes} minutes
                    </p>
                    <p>Exam duration</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {passingScore}% to pass
                    </p>
                    <p>Pass threshold</p>
                  </div>
                </div>
              </div>

              {selectedSession && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">
                      {selectedSession.title}
                    </p>
                    <p className="text-muted-foreground">
                      Exam opens{' '}
                      {examStartDate
                        ? formatDate(examStartDate)
                        : formatDate(selectedSession.examStartDate)}
                    </p>
                    <p className="text-muted-foreground">
                      Exam closes{' '}
                      {examEndDate
                        ? formatDate(examEndDate)
                        : formatDate(selectedSession.examEndDate)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'active'
                ? 'Activate exam?'
                : pendingAction === 'closed'
                  ? 'Close exam?'
                  : pendingAction === 'archived'
                    ? 'Archive exam?'
                    : pendingAction === 'release-results'
                      ? 'Release results?'
                      : 'Email results?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'active'
                ? 'Applicants in this session will be able to access this exam during the live exam window.'
                : pendingAction === 'closed'
                  ? 'Applicants will no longer be able to take this exam until it is activated again.'
                  : pendingAction === 'archived'
                    ? 'This exam will be moved out of normal circulation and hidden from active use.'
                    : pendingAction === 'release-results'
                      ? 'Applicants who have completed this exam will be able to see their published results.'
                      : 'This will send result emails to applicants with releasable results for this exam.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={statusUpdating || releasingResults || sendingResults}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingAction}
              disabled={statusUpdating || releasingResults || sendingResults}
              className={
                pendingAction === 'archived'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : undefined
              }
            >
              {statusUpdating || releasingResults || sendingResults ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working...
                </>
              ) : pendingAction === 'active' ? (
                'Activate'
              ) : pendingAction === 'closed' ? (
                'Close'
              ) : pendingAction === 'archived' ? (
                'Archive'
              ) : pendingAction === 'release-results' ? (
                'Release Results'
              ) : (
                'Send Emails'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
