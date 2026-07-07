import { useEffect, useState } from "react";
import { AdminLoading } from "@/components/admin/AdminLoading";
import Link from "@/lib/compat/link";
import { Plus, BookOpen, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getExamsList, type ExamListItem } from "@/lib/admin-exams";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/20 text-success",
  closed: "bg-warning/20 text-warning",
  archived: "bg-destructive/20 text-destructive",
};

export function AdminExamsPage() {
  const [rows, setRows] = useState<ExamListItem[] | null>(null);

  useEffect(() => {
    getExamsList().then(setRows).catch((e) => console.error("[admin exams]", e));
  }, []);

  if (!rows) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Examinations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage entrance examination papers.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 font-medium shadow-brand-sm">
          <Link href="/admin/exams/new">
            <Plus className="h-4 w-4" />
            New Exam
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-foreground">No exams yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Create your first examination paper.</p>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/admin/exams/new">
              <Plus className="h-4 w-4" />
              New Exam
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((exam) => (
            <Link key={exam.id} href={`/admin/exams/${exam.id}`}>
              <Card className="hover:border-primary/30 hover:shadow-brand-sm transition-all cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-serif text-base leading-snug">{exam.title}</CardTitle>
                    <Badge className={STATUS_COLORS[exam.status] ?? ""}>{exam.status}</Badge>
                  </div>
                  <CardDescription className="text-xs">Updated {formatDate(exam.updatedAt)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center rounded-lg bg-muted/50 p-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-semibold">{exam.durationMinutes}m</p>
                      <p className="text-[10px] text-muted-foreground">Duration</p>
                    </div>
                    <div className="text-center rounded-lg bg-muted/50 p-2">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-semibold">{exam.totalMarks}</p>
                      <p className="text-[10px] text-muted-foreground">Marks</p>
                    </div>
                    <div className="text-center rounded-lg bg-muted/50 p-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-semibold">{exam.attempts}</p>
                      <p className="text-[10px] text-muted-foreground">Attempts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
