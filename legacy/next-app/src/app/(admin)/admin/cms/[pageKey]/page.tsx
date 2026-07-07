import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { cmsPages } from "@/db/schema/cms";
import { eq } from "drizzle-orm";
import { CMSPageEditorClient } from "./CMSPageEditorClient";

const VALID_PAGE_KEYS = [
  "homepage",
  "about",
  "admissions",
  "contact",
  "mission",
  "vision",
] as const;

type ValidPageKey = (typeof VALID_PAGE_KEYS)[number];

const PAGE_LABELS: Record<ValidPageKey, string> = {
  homepage: "Homepage Content",
  about: "About Page",
  admissions: "Admissions Page",
  contact: "Contact Page",
  mission: "Mission Statement",
  vision: "Vision Statement",
};

type Props = {
  params: Promise<{ pageKey: string }>;
};

export default async function CMSPageEditorPage({ params }: Props) {
  const { pageKey } = await params;
  await requireRole(["admin"]);

  if (!VALID_PAGE_KEYS.includes(pageKey as ValidPageKey)) {
    redirect("/admin/cms");
  }

  const validKey = pageKey as ValidPageKey;

  // Fetch existing page content (may be null)
  const existing = db
    ? await db
        .select()
        .from(cmsPages)
        .where(eq(cmsPages.pageKey, validKey))
        .limit(1)
        .then((r) => r[0] ?? null)
    : null;

  return (
    <CMSPageEditorClient
      pageKey={validKey}
      pageLabel={PAGE_LABELS[validKey]}
      existing={existing}
    />
  );
}
