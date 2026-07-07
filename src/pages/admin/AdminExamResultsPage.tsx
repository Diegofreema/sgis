import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import Link from "@/lib/compat/link";
import { ArrowLeft, Award, CheckCircle2, Clock, FileText, Search, Users, XCircle } from "lucide-react";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { NotFound } from "@/components/shared/NotFound";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getExamTitle, listExamResults, type ExamResultRow } from "@/lib/admin-exams";

const routeApi = getRouteApi("/admin/exams/$id/results");
const PAGE_SIZE = 20;

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

export function AdminExamResultsPage() {
  const { id: examId } = routeApi.useParams();
  const { page: pageParam } = routeApi.useSearch();
  const currentPage = Math.max(1, Number(pageParam ?? 1) || 1);

  const [state, setState] = useState<
    { title: string | null; rows: ExamResultRow[]; total: number; page: number } | "loading" | "notfound"
  >("loading");

  useEffect(() => {
    let active = true;
    setState("loading");
    (async () => {
      const title = await getExamTitle(examId);
      if (!title) {
        if (active) setState("notfound");
        return;
      }
      const res = await listExamResults(examId, { page: currentPage, pageSize: PAGE_SIZE });
      if (active) setState({ title, rows: res.rows, total: res.total, page: res.page });
    })().catch((e) => console.error("[exam results]", e));
    return () => {
      active = false;
    };
  }, [examId, currentPage]);

  if (state === "loading") return <AdminLoading />;
  if (state === "notfound") return <NotFound />;

  const { title, rows, total, page } = state;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <Button asChild size="sm" variant="ghost">
        <Link href={`/admin/exams/${examId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to exam
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Exam results</p>
          <h1 className="font-serif text-2xl font-semibold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {total} attempt{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total attempts" value={total} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Graded" value={rows.filter((r) => r.status === "graded").length} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="In progress" value={rows.filter((r) => r.status === "in_progress").length} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Submitted" value={rows.filter((r) => r.status === "submitted").length} icon={<FileText className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-base">Attempts</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No attempts yet.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Applicant</th>
                      <th className="py-2 pr-4 font-medium">Application ID</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Score</th>
                      <th className="py-2 pr-4 font-medium">Result</th>
                      <th className="py-2 font-medium text-right">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium text-foreground">{row.applicantName}</p>
                            <p className="text-xs text-muted-foreground">{row.applicantEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <code className="text-xs font-semibold">{row.applicationCode}</code>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary" className="text-xs">{row.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {row.score != null ? (
                            <span className="tabular-nums font-semibold">
                              {Number(row.score)}{row.totalMarks != null ? `/${row.totalMarks}` : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {row.passed === true ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <Award className="h-3.5 w-3.5" />
                              Passed
                            </span>
                          ) : row.passed === false ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                              <XCircle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 text-right text-xs text-muted-foreground">
                          {row.submittedAt ? formatDate(row.submittedAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    {currentPage > 1 && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/exams/${examId}/results?page=${currentPage - 1}`}>Previous</Link>
                      </Button>
                    )}
                    {currentPage < totalPages && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/exams/${examId}/results?page=${currentPage + 1}`}>Next</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
