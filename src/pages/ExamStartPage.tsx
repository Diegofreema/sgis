import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLoading } from "@/components/admin/AdminLoading";
import Link from "@/lib/compat/link";
import { EXAM_TOKEN_KEY } from "@/components/entrance-exam/ApplicationClient";
import { examStart, examSubmit, type ExamStartData } from "@/lib/edge";

type Phase = "loading" | "taking" | "submitting" | "done" | "error";

function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function ExamStartPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<ExamStartData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const token = useRef<string | null>(null);
  const submittedRef = useRef(false);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current || !data || !token.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    const result = await examSubmit({
      token: token.current,
      attemptId: data.attemptId,
      answers: data.questions.map((q) => ({ questionId: q.id, selectedOption: answers[q.id] ?? null })),
    });
    if (!result.success) {
      submittedRef.current = false;
      toast.error(result.error);
      setPhase("taking");
      return;
    }
    setPhase("done");
  }, [data, answers]);

  useEffect(() => {
    const t = window.sessionStorage.getItem(EXAM_TOKEN_KEY);
    if (!t) {
      navigate({ to: "/entrance-exam", hash: "exam-access" });
      return;
    }
    token.current = t;
    let active = true;
    examStart(t)
      .then((r) => {
        if (!active) return;
        if (!r.success) {
          setErrorMsg(r.error);
          setPhase("error");
          return;
        }
        setData(r.data);
        setPhase("taking");
      })
      .catch((e) => {
        console.error("[exam start]", e);
        if (active) {
          setErrorMsg("Could not start the exam.");
          setPhase("error");
        }
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  // Countdown + auto-submit on expiry.
  useEffect(() => {
    if (phase !== "taking" || !data) return;
    const expiry = new Date(data.expiresAt).getTime();
    const tick = () => {
      const left = expiry - Date.now();
      setRemaining(left);
      if (left <= 0) doSubmit();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [phase, data, doSubmit]);

  if (phase === "loading") {
    return <section className="section-padding"><div className="container mx-auto container-padding max-w-3xl"><AdminLoading /></div></section>;
  }

  if (phase === "error") {
    return (
      <section className="section-padding">
        <div className="container mx-auto container-padding max-w-lg">
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <p className="font-serif text-lg font-semibold text-foreground">Cannot start exam</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button asChild variant="outline">
                <Link href="/entrance-exam#exam-access">Back to exam access</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section className="section-padding">
        <div className="container mx-auto container-padding max-w-lg">
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <p className="font-serif text-xl font-semibold text-foreground">Exam submitted</p>
              <p className="text-sm text-muted-foreground">
                Your answers have been recorded. Track your result from the entrance exam page using your application ID.
              </p>
              <Button asChild>
                <Link href="/entrance-exam#status">Track application</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (!data) return null;
  const answeredCount = data.questions.filter((q) => answers[q.id]).length;

  return (
    <section className="section-padding">
      <div className="container mx-auto container-padding max-w-3xl space-y-6">
        <div className="sticky top-16 z-10 flex items-center justify-between rounded-xl border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono font-semibold tabular-nums">{countdown(remaining)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {answeredCount}/{data.questions.length} answered
          </p>
        </div>

        {data.questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium leading-snug">
                <span className="mr-2 text-primary">{i + 1}.</span>
                {q.questionText}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold uppercase ${
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span className="text-foreground">{opt.text}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end">
          <Button onClick={doSubmit} disabled={phase === "submitting"} className="gap-2" size="lg">
            {phase === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit exam
          </Button>
        </div>
      </div>
    </section>
  );
}
