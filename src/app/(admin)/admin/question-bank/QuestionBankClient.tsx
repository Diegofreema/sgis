'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, X } from 'lucide-react';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BulkQuestionUploadDialog } from '@/components/admin/BulkQuestionUploadDialog';
import { QuestionEditor } from '@/components/admin/QuestionEditor';

type Props = {
  questions: {
    id: string;
    examId: string | null;
    questionText: string;
    questionImageUrl: string | null;
    options: { id: string; text: string }[];
    correctOption: string;
    explanation: string | null;
    marks: string;
    difficulty: 'easy' | 'medium' | 'hard';
    subject: string | null;
    type: 'single_choice';
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    q: string;
    subject: string;
    difficulty: '' | 'easy' | 'medium' | 'hard';
  };
  subjects: string[];
};

function buildHref(input: {
  page?: number;
  q?: string;
  subject?: string;
  difficulty?: string;
}) {
  const params = new URLSearchParams();
  if (input.page && input.page > 1) params.set('page', String(input.page));
  if (input.q?.trim()) params.set('q', input.q.trim());
  if (input.subject?.trim()) params.set('subject', input.subject.trim());
  if (input.difficulty?.trim())
    params.set('difficulty', input.difficulty.trim());
  const query = params.toString();
  return query ? `/admin/question-bank?${query}` : '/admin/question-bank';
}

export function QuestionBankClient({
  questions,
  total,
  page,
  pageSize,
  filters,
  subjects,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [subject, setSubject] = useState(filters.subject);
  const [difficulty, setDifficulty] = useState<Props['filters']['difficulty']>(
    filters.difficulty,
  );
  const hasFilters = Boolean(
    filters.q.trim() || filters.subject.trim() || filters.difficulty,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  const pageLinks = useMemo(() => {
    const links = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let value = start; value <= end; value += 1) {
      links.push(value);
    }
    return links;
  }, [page, totalPages]);

  function applyFilters() {
    router.push(
      buildHref({
        q,
        subject,
        difficulty,
        page: 1,
      }),
    );
  }

  function resetFilters() {
    setQ('');
    setSubject('');
    setDifficulty('');
    router.push('/admin/question-bank');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Question Bank
          </h1>
          <p className="text-sm text-muted-foreground">
            Create objective questions once and reuse them across session exams.
          </p>
        </div>
        <BulkQuestionUploadDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base">Find Questions</CardTitle>
          <CardDescription className="text-xs">
            Search by wording, subject, or explanation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="question-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="question-search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search questions"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subject || 'all'}
              onValueChange={(value) =>
                setSubject(value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select
              value={difficulty || 'all'}
              onValueChange={(value) =>
                setDifficulty(
                  value === 'all'
                    ? ''
                    : (value as Props['filters']['difficulty']),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="self-end gap-2" onClick={applyFilters}>
            <Search className="h-4 w-4" />
            Apply
          </Button>
          <Button
            variant="outline"
            className="self-end gap-2"
            onClick={resetFilters}
          >
            <X className="h-4 w-4" />
            Reset
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base">
            Question Library
          </CardTitle>
          <CardDescription className="text-xs">
            {total === 0
              ? 'No questions matched this filter.'
              : `Showing ${rangeStart}-${rangeEnd} of ${total} reusable questions.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length === 0 && (
            <div className="mb-6 flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <BookOpen className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-foreground">
                {hasFilters
                  ? 'No questions matched this filter'
                  : 'No question bank items yet'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFilters
                  ? 'Clear the filters or create a new question below.'
                  : 'Start by filling the question form below.'}
              </p>
            </div>
          )}
          <QuestionEditor questions={questions} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              {page > 1 ? (
                <PaginationPrevious
                  href={buildHref({
                    page: page - 1,
                    q: filters.q,
                    subject: filters.subject,
                    difficulty: filters.difficulty,
                  })}
                />
              ) : (
                <span className="text-sm text-muted-foreground">Previous</span>
              )}
            </PaginationItem>
            {pageLinks.map((value) => (
              <PaginationItem key={value}>
                <PaginationLink
                  href={buildHref({
                    page: value,
                    q: filters.q,
                    subject: filters.subject,
                    difficulty: filters.difficulty,
                  })}
                  isActive={value === page}
                >
                  {value}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              {page < totalPages ? (
                <PaginationNext
                  href={buildHref({
                    page: page + 1,
                    q: filters.q,
                    subject: filters.subject,
                    difficulty: filters.difficulty,
                  })}
                />
              ) : (
                <span className="text-sm text-muted-foreground">Next</span>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
