import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Landmark,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getActiveApplicationPeriod,
  getAllApplicationPeriods,
  getLatestOpenApplicationPeriod,
} from "@/server/queries/applications.queries";
import { getActiveBankAccounts } from "@/server/queries/bank-accounts.queries";
import {
  getPublicExamAccess,
  getPublicExamDiscovery,
  type PublicExamAccess,
  type PublicExamDiscovery,
} from "@/server/queries/exams.queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import {
  ApplicationTracker,
  PrintButton,
  PublicApplicationForm,
  PublicExamSessionPicker,
} from "./ApplicationClient";

export const metadata: Metadata = {
  title: "Entrance Examination",
  description: "Apply for the Sankt Georg International School entrance examination.",
};

type Props = {
  searchParams: Promise<{
    applicationId?: string;
    error?: string;
    session?: string;
    examError?: string;
  }>;
};

export default async function EntranceExamPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;

  const [period, latestOpenPeriod, bankAccounts, trackedAccess, allPeriods] = await Promise.all([
    getActiveApplicationPeriod(),
    getLatestOpenApplicationPeriod(),
    getActiveBankAccounts(),
    params.applicationId
      ? getPublicExamAccess({
          applicationCode: params.applicationId,
        })
      : Promise.resolve<PublicExamAccess | null>(null),
    getAllApplicationPeriods(),
  ]);

  const publicExamSessions = sortPublicExamSessions(allPeriods);
  const defaultExamSession = publicExamSessions[0] ?? null;
  const requestedExamSession = params.session
    ? publicExamSessions.find((session) => session.id === params.session) ?? null
    : null;
  const selectedExamSession = requestedExamSession ?? defaultExamSession;
  const sessionParamInvalid = Boolean(params.session) && !requestedExamSession;
  const selectedDiscovery =
    selectedExamSession && !sessionParamInvalid
      ? await getPublicExamDiscovery(selectedExamSession.id)
      : null;

  const displayPeriod = period ?? latestOpenPeriod;
  const hasScheduledOpenPeriod =
    !period &&
    !!latestOpenPeriod &&
    new Date() < new Date(latestOpenPeriod.applicationStartDate);
  const hasExpiredOpenPeriod =
    !period &&
    !!latestOpenPeriod &&
    new Date() > new Date(latestOpenPeriod.applicationEndDate);

  return (
    <>
      <section className="bg-linear-to-b from-secondary/40 to-background pb-10 pt-28 print:hidden">
        <div className="container mx-auto container-padding">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">Admissions</p>
            <h1 className="font-serif text-h1 font-bold leading-tight text-foreground">
              Entrance Examination Application
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Apply for the common entrance examination, upload your receipt and required documents, then use your application ID to track your application and exam access.
            </p>
          </div>
        </div>
      </section>

      <section id="status" className="py-8 print:py-0">
        <div className="container mx-auto container-padding">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="print:hidden">
              <CardTitle className="font-serif text-lg">Track application and exam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="print:hidden">
                <ApplicationTracker />
              </div>

              {!params.applicationId && !params.error && (
                <SearchStateCard
                  icon={<SearchIcon />}
                  title="No application selected"
                  description="Enter your application ID to view your application status."
                />
              )}

              {params.error && (
                <SearchStateCard
                  tone="error"
                  icon={<AlertCircle className="h-5 w-5" />}
                  title="Something went wrong"
                  description={params.error}
                />
              )}

              {trackedAccess?.state === "not_found" && (
                <SearchStateCard
                  tone="error"
                  icon={<AlertCircle className="h-5 w-5" />}
                  title="Application not found"
                  description="Check the application ID and try again."
                />
              )}

              {trackedAccess?.application && trackedAccess.period && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <Image
                        src="/logo.jpeg"
                        alt={siteConfig.name}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover"
                      />
                      <div>
                        <h2 className="font-serif text-xl font-semibold">{siteConfig.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {siteConfig.address.street}, {siteConfig.address.city}, {siteConfig.address.country}
                        </p>
                        <p className="mt-2 font-mono text-sm font-semibold">
                          {trackedAccess.application.applicationCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={trackedAccess.application.status} />
                      <PrintButton label="Print status" />
                    </div>
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <Info
                      label="Applicant"
                      value={`${trackedAccess.application.firstName} ${trackedAccess.application.lastName}`}
                    />
                    <Info label="Application ID" value={trackedAccess.application.applicationCode} />
                    <Info label="Session" value={trackedAccess.period.title} />
                    <Info
                      label="Submitted"
                      value={
                        trackedAccess.application.submittedAt
                          ? formatDate(trackedAccess.application.submittedAt)
                          : "Pending"
                      }
                    />
                  </dl>

                  {trackedAccess.application.status === "rejected" &&
                    trackedAccess.application.rejectionReason && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                        <p className="font-medium text-destructive">Application rejected</p>
                        <p className="mt-1 text-muted-foreground">
                          {trackedAccess.application.rejectionReason}
                        </p>
                      </div>
                    )}

                  {trackedAccess.application.status === "approved" ? (
                    <div className="rounded-lg border border-success/30 bg-success/5 p-4 print:break-before-page">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-success">Application approved</p>
                          <p className="text-sm text-muted-foreground">
                            Use the secure exam access section below to start or continue your exam.
                          </p>
                        </div>
                        <PrintButton label="Print ID" />
                      </div>
                      <div className="mt-4 rounded-lg border bg-background p-4">
                        <div className="flex items-center gap-4">
                          <Image
                            src="/logo.jpeg"
                            alt={siteConfig.name}
                            width={48}
                            height={48}
                            className="rounded-md object-cover"
                          />
                          <div>
                            <p className="font-serif font-semibold">{siteConfig.name}</p>
                            <p className="text-xs text-muted-foreground">Entrance Examination ID Card</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <dl className="grid gap-2 text-sm">
                            <Info
                              label="Name"
                              value={`${trackedAccess.application.firstName} ${trackedAccess.application.lastName}`}
                            />
                            <Info label="Application ID" value={trackedAccess.application.applicationCode} />
                            <Info label="Session" value={trackedAccess.period.title} />
                          </dl>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-muted-foreground print:hidden">
                      Secure exam access becomes available after admin approval.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="exam-access" className="pb-8 print:hidden">
        <div className="container mx-auto container-padding">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Take your exam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {publicExamSessions.length > 0 ? (
                <PublicExamSessionPicker
                  sessions={publicExamSessions.map((session) => ({
                    id: session.id,
                    title: session.title,
                  }))}
                  selectedSessionId={selectedExamSession?.id ?? ""}
                />
              ) : (
                <SearchStateCard
                  icon={<AlertCircle className="h-5 w-5" />}
                  title="No session available"
                  description="No exam session is available right now."
                />
              )}

              {sessionParamInvalid && (
                <SearchStateCard
                  tone="error"
                  icon={<AlertCircle className="h-5 w-5" />}
                  title="Session not found"
                  description="Pick a valid session to continue."
                />
              )}

              {!sessionParamInvalid && selectedDiscovery && (
                <PublicExamDiscoverySection discovery={selectedDiscovery} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="section-padding bg-muted/20 print:hidden">
        <div className="container mx-auto container-padding">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-5">
                  {displayPeriod ? (
                    <>
                      {period ? (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="h-5 w-5" />
                          <p className="font-medium">Applications are open</p>
                        </div>
                      ) : hasScheduledOpenPeriod ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-primary">
                            <Clock className="h-5 w-5" />
                            <p className="font-medium">Applications open soon</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Applications for this session open on{" "}
                            {formatDate(displayPeriod.applicationStartDate, "MMMM d, yyyy 'at' h:mm a")}.
                          </p>
                        </div>
                      ) : hasExpiredOpenPeriod ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="h-5 w-5" />
                            <p className="font-medium">Application window has ended</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            This session closed on{" "}
                            {formatDate(displayPeriod.applicationEndDate, "MMMM d, yyyy 'at' h:mm a")}.
                          </p>
                        </div>
                      ) : null}
                      <Info label="Academic session" value={displayPeriod.title} />
                      <Info label="Application opens" value={formatDate(displayPeriod.applicationStartDate)} />
                      <Info label="Application closes" value={formatDate(displayPeriod.applicationEndDate)} />
                      <Info label="Exam starts" value={formatDate(displayPeriod.examStartDate)} />
                      <Info label="Application fee" value={formatCurrency(Number(displayPeriod.registrationFee), displayPeriod.currency)} />
                    </>
                  ) : (
                    <div className="space-y-2">
                      <AlertCircle className="h-6 w-6 text-muted-foreground" />
                      <p className="font-medium">Applications are closed</p>
                      <p className="text-sm text-muted-foreground">
                        Check back later for the next session.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {bankAccounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-serif text-base">
                      <Landmark className="h-4 w-4" />
                      Payment account
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {bankAccounts.map((account) => (
                      <div key={account.id} className="rounded-lg border bg-background p-3 text-sm">
                        <p className="font-medium">{account.bankName}</p>
                        <p>{account.accountName}</p>
                        <p className="font-mono text-base font-semibold">{account.accountNumber}</p>
                        {account.notes && <p className="mt-2 text-xs text-muted-foreground">{account.notes}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Apply now</CardTitle>
              </CardHeader>
              <CardContent>
                {period ? (
                  <PublicApplicationForm />
                ) : hasScheduledOpenPeriod && displayPeriod ? (
                  <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    Applications for this session open on{" "}
                    {formatDate(displayPeriod.applicationStartDate, "MMMM d, yyyy 'at' h:mm a")}.
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    The application form will be available when admissions open.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}

function SearchStateCard({
  title,
  description,
  icon,
  tone = "neutral",
}: {
  title: string;
  description: string;
  icon: ReactNode;
  tone?: "neutral" | "error";
}) {
  const classes =
    tone === "error"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : "border-border bg-muted/30 text-muted-foreground";

  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return <Search className="h-5 w-5" />;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return <Badge className="border-success/30 bg-success/20 text-success">Approved</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="secondary">Pending</Badge>;
}

function PublicExamDiscoverySection({
  discovery,
}: {
  discovery: PublicExamDiscovery;
}) {
  if (discovery.state === "not_found" || !discovery.period) {
    return (
      <SearchStateCard
        tone="error"
        icon={<AlertCircle className="h-5 w-5" />}
        title="Session not found"
        description="Pick another session to continue."
      />
    );
  }

  if (discovery.state === "no_exam_for_session") {
    return (
      <SearchStateCard
        icon={<AlertCircle className="h-5 w-5" />}
        title="No exam for this session"
        description="There is no active exam attached to this session yet."
      />
    );
  }

  if (!discovery.exam) return null;

  const previewHref = `/entrance-exam/exam?session=${encodeURIComponent(discovery.period.id)}`;
  const statusLabel =
    discovery.state === "live"
      ? "Exam live"
      : discovery.state === "verification_open"
        ? "Verification open"
        : discovery.state === "preview_open"
          ? "Preview open"
          : discovery.state === "preview_locked"
            ? "Preview locked"
            : "Closed";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-2xl border bg-muted/20 p-5">
        <div className="space-y-1">
          <p className="font-serif text-xl font-semibold text-foreground">{discovery.exam.title}</p>
          <p className="text-sm text-muted-foreground">
            {discovery.exam.durationMinutes} minutes, {discovery.exam.totalMarks} marks, {discovery.exam.passingScore}% to pass
          </p>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Session" value={discovery.period.title} />
          <Info label="Exam starts" value={formatDate(discovery.period.examStartDate, "MMMM d, yyyy")} />
          <Info label="Exam closes" value={formatDate(discovery.period.examEndDate, "MMMM d, yyyy")} />
          <Info label="Preview opens" value={formatDate(discovery.previewOpensAt ?? discovery.period.examStartDate, "MMMM d, yyyy 'at' h:mm a")} />
          <Info label="Status" value={statusLabel} />
        </dl>

        {discovery.exam.instructions && (
          <div className="mt-4 rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            {discovery.exam.instructions}
          </div>
        )}
      </div>

      {discovery.state === "preview_open" ||
      discovery.state === "verification_open" ||
      discovery.state === "live" ? (
        <div className="rounded-2xl border bg-background p-5">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Open exam preview</p>
            <p className="text-sm text-muted-foreground">
              {discovery.state === "preview_open"
                ? "Preview is live. Verification opens 5 minutes before the exam starts."
                : discovery.state === "verification_open"
                  ? "Countdown is live and you can now verify your exam access."
                  : "The exam is live. Verify your access or continue from the preview page."}
            </p>
          </div>
          <Button asChild className="mt-5 w-full gap-2">
            <Link href={previewHref}>
              Open preview
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : discovery.state === "preview_locked" ? (
        <SearchStateCard
          icon={<Clock className="h-5 w-5" />}
          title="Preview locked"
          description={`Preview opens on ${formatDate(discovery.previewOpensAt ?? discovery.period.examStartDate, "MMMM d, yyyy 'at' h:mm a")}.`}
        />
      ) : (
        <SearchStateCard
          icon={<Clock className="h-5 w-5" />}
          title="Exam window has closed"
          description={`This exam closed on ${formatDate(discovery.period.examEndDate, "MMMM d, yyyy 'at' h:mm a")}.`}
        />
      )}
    </div>
  );
}

function sortPublicExamSessions(periods: Awaited<ReturnType<typeof getAllApplicationPeriods>>) {
  const now = Date.now();

  return periods
    .filter((period) => period.status !== "archived")
    .sort((left, right) => {
      const leftCurrentOrFuture = new Date(left.examEndDate).getTime() >= now;
      const rightCurrentOrFuture = new Date(right.examEndDate).getTime() >= now;

      if (leftCurrentOrFuture !== rightCurrentOrFuture) {
        return leftCurrentOrFuture ? -1 : 1;
      }

      return (
        new Date(right.examStartDate).getTime() - new Date(left.examStartDate).getTime()
      );
    });
}
