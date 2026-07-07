import { useEffect, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import Link from "@/lib/compat/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { PublicExamVerificationCard } from "@/components/entrance-exam/ApplicationClient";
import { examDiscovery, type ExamDiscoveryData } from "@/lib/edge";
import { formatDate } from "@/lib/utils";

const routeApi = getRouteApi("/public/entrance-exam/exam");

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="section-padding">
      <div className="container mx-auto container-padding max-w-3xl space-y-6">
        <Button asChild size="sm" variant="ghost">
          <Link href="/entrance-exam#exam-access">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to entrance exam
          </Link>
        </Button>
        {children}
      </div>
    </section>
  );
}

function StateCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center space-y-2">
        <p className="font-serif text-lg font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ExamPreviewPage() {
  const { session } = routeApi.useSearch();
  const navigate = useNavigate();
  const [discovery, setDiscovery] = useState<ExamDiscoveryData | null | "loading">("loading");

  useEffect(() => {
    if (!session) {
      navigate({ to: "/entrance-exam", hash: "exam-access" });
      return;
    }
    let active = true;
    setDiscovery("loading");
    examDiscovery(session)
      .then((r) => active && setDiscovery(r.success ? r.data : null))
      .catch((e) => console.error("[exam preview]", e));
    return () => {
      active = false;
    };
  }, [session, navigate]);

  if (discovery === "loading") return <PreviewShell><AdminLoading /></PreviewShell>;
  if (!discovery || discovery.state === "not_found" || !discovery.period) {
    return <PreviewShell><StateCard title="Session not found" description="Choose a valid session from the exam access section." /></PreviewShell>;
  }
  if (discovery.state === "no_exam_for_session" || !discovery.exam) {
    return <PreviewShell><StateCard title="No exam for this session" description="There is no active exam attached to this session yet." /></PreviewShell>;
  }

  const canVerify = discovery.state === "verification_open" || discovery.state === "live";

  return (
    <PreviewShell>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{discovery.exam.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {discovery.exam.durationMinutes} minutes · {discovery.exam.totalMarks} marks · {discovery.exam.passingScore}% to pass
          </p>
          <p>Exam starts {formatDate(discovery.period.examStartDate, "MMMM d, yyyy 'at' h:mm a")}</p>
          {discovery.exam.instructions && (
            <div className="mt-2 rounded-xl border bg-background p-4 text-foreground">{discovery.exam.instructions}</div>
          )}
        </CardContent>
      </Card>

      {canVerify ? (
        <PublicExamVerificationCard periodId={discovery.period.id} />
      ) : discovery.state === "preview_open" ? (
        <StateCard
          title="Verification opens soon"
          description={`You can request your access code 5 minutes before the exam starts (${formatDate(
            discovery.verificationOpensAt ?? discovery.period.examStartDate,
            "MMMM d, yyyy 'at' h:mm a",
          )}).`}
        />
      ) : discovery.state === "preview_locked" ? (
        <div className="rounded-2xl border bg-background p-5 flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Preview opens on {formatDate(discovery.previewOpensAt ?? discovery.period.examStartDate, "MMMM d, yyyy 'at' h:mm a")}.
          </p>
        </div>
      ) : (
        <StateCard title="Exam window has closed" description={`This exam closed on ${formatDate(discovery.period.examEndDate, "MMMM d, yyyy 'at' h:mm a")}.`} />
      )}
    </PreviewShell>
  );
}
