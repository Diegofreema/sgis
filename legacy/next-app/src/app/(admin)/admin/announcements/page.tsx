import { requireRole } from "@/lib/auth";
import { listAllAnnouncements } from "@/server/queries/cms.queries";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnnouncementsAdminClient } from "./AnnouncementsAdminClient";

export default async function AnnouncementsPage() {
  await requireRole(["admin"]);
  const all = await listAllAnnouncements();
  return (
    <FadeIn>
      <AnnouncementsAdminClient announcements={all} />
    </FadeIn>
  );
}
