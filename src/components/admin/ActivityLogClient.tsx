import { ScrollText } from "lucide-react";
import type { ActivityLog } from "@/lib/admin";

type Props = { logs: ActivityLog[] };

// ─── Turn machine action codes into plain English ───────────────────────────
// Actions arrive as `entity.verb` (e.g. `announcements.updated`, `user.login`).
// Non-technical admins shouldn't have to read that, so we describe each one.

type Tone = "pos" | "neg" | "neutral";

// Friendly noun per table/entity token.
const ENTITY_NOUNS: Record<string, string> = {
  announcements: "announcement",
  gallery_items: "gallery item",
  carousel_slides: "carousel slide",
  cms_pages: "page",
  news_articles: "news article",
  admission_settings: "settings",
  bank_accounts: "bank account",
  application_periods: "application period",
  applications: "application",
  payments: "payment",
  profiles: "admin",
  exams: "exam",
  questions: "question",
  exam_questions: "exam question",
  settings: "settings",
  application_period: "application period",
  bank_account: "bank account",
  user: "admin",
};

// Uncountable nouns that read wrong with "a/an".
const NO_ARTICLE = new Set(["settings"]);

// Fully-spelled phrases for actions that don't follow the generic verb pattern
// (mostly legacy rows + the explicit edge-function logs).
const SPECIALS: Record<string, string> = {
  "user.login": "Signed in",
  "user.registered": "Registered an account",
  "user.created": "Added a new admin",
  "exam.submitted": "Submitted an exam",
  "exam.public_started": "Started an exam",
  "application.public_created": "Submitted an application",
  "application.approved": "Approved an application",
  "application.rejected": "Rejected an application",
  "application.pending": "Moved an application back to pending",
  "settings.updated": "Updated the settings",
  "settings.school_updated": "Updated the school details",
  "application_period.open": "Opened an application period",
  "application_period.updated": "Updated an application period",
  "bank_account.created": "Added a bank account",
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "an" : "a";
}

function toneOf(action: string): Tone {
  if (/\.(deleted|rejected)$/.test(action)) return "neg";
  if (/\.(created|approved|open)$/.test(action)) return "pos";
  return "neutral";
}

function describeAction(action: string): { label: string; tone: Tone } {
  const tone = toneOf(action);
  if (SPECIALS[action]) return { label: SPECIALS[action], tone };

  const i = action.lastIndexOf(".");
  const entity = i >= 0 ? action.slice(0, i) : action;
  const verb = i >= 0 ? action.slice(i + 1) : action;
  const noun = ENTITY_NOUNS[entity] ?? entity.replace(/_/g, " ");
  const verbWord =
    verb === "created" ? "Added" : verb === "updated" ? "Updated" : verb === "deleted" ? "Deleted" : cap(verb);

  const label = NO_ARTICLE.has(noun)
    ? `${verbWord} the ${noun}`
    : `${verbWord} ${article(noun)} ${noun}`;
  return { label, tone };
}

// snake_case column → readable label, e.g. `guardian_phone` → "Guardian phone".
function humanizeField(field: string): string {
  return cap(field.replace(/_/g, " "));
}

function actorName(actor: ActivityLog["actor"]): string {
  if (!actor) return "System";
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ");
  return name || actor.email;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DOT: Record<Tone, string> = {
  pos: "bg-success",
  neg: "bg-destructive",
  neutral: "bg-muted-foreground/50",
};

export function ActivityLogClient({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card flex flex-col items-center py-16 gap-3 text-center">
        <ScrollText className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {logs.map((log) => {
        const { label, tone } = describeAction(log.action);
        const rawChanged = (log.metadata as { changed?: unknown } | null)?.changed;
        const changed = Array.isArray(rawChanged) ? (rawChanged as string[]).map(humanizeField) : null;
        const who = actorName(log.actor);
        return (
          <div
            key={log.id}
            className="flex items-start justify-between px-4 py-3 gap-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${DOT[tone]}`} />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  by {who}
                  {changed && changed.length ? ` · Changed: ${changed.join(", ")}` : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground shrink-0 text-right">{formatWhen(log.createdAt)}</p>
          </div>
        );
      })}
    </div>
  );
}
