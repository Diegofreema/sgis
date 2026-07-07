
import { useState } from "react";
import { Bell, X } from "lucide-react";
import type { Announcement } from "@/types/cms";
import { formatDate } from "@/lib/utils";

type AnnouncementBannerProps = {
  announcement: Announcement;
};

function getDismissKey(id: string) {
  return `announcement-banner:hidden:${id}`;
}

function getSummary(announcement: Announcement) {
  const summary = announcement.excerpt?.trim() || announcement.body.trim();
  if (!summary) return null;
  return summary.length > 180 ? `${summary.slice(0, 177).trimEnd()}...` : summary;
}

export function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(getDismissKey(announcement.id)) === "1";
    } catch {
      return false;
    }
  });
  const summary = getSummary(announcement);

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(getDismissKey(announcement.id), "1");
    } catch {}
  }

  if (hidden) return null;

  return (
    <div className="relative z-40 mt-16 overflow-hidden border-b border-primary/10 bg-linear-to-r from-primary via-primary/95 to-primary/80 text-primary-foreground shadow-brand-sm md:mt-18">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(1_0_0/0.14),transparent_32%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/15" />

      <div className="container relative mx-auto container-padding py-4">
        <div className="flex items-start gap-4 rounded-3xl border border-white/12 bg-black/10 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-sm md:items-center md:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/18">
            <Bell className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/72">
              <span className="rounded-full bg-white/14 px-2.5 py-1 text-primary-foreground">
                {announcement.isImportant ? "Important Notice" : "School Notice"}
              </span>
              {announcement.publishedAt ? (
                <span>Published {formatDate(announcement.publishedAt)}</span>
              ) : null}
            </div>

            <h2 className="mt-3 max-w-3xl text-base font-semibold leading-tight text-primary-foreground md:text-lg">
              {announcement.title}
            </h2>

            {summary ? (
              <p className="mt-2 max-w-4xl text-sm leading-relaxed text-primary-foreground/84 md:text-[15px]">
                {summary}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide announcement"
            className="shrink-0 rounded-full border border-white/14 bg-white/8 p-2 text-primary-foreground/78 transition hover:bg-white/14 hover:text-primary-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
