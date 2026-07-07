import { useCallback, useEffect, useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AnnouncementsAdminClient } from "@/components/admin/AnnouncementsAdminClient";
import { listAllAnnouncements } from "@/lib/admin";
import type { Announcement } from "@/types/cms";

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);

  const load = useCallback(() => {
    listAllAnnouncements()
      .then(setAnnouncements)
      .catch((e) => console.error("[announcements]", e));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!announcements) return <AdminLoading />;

  return (
    <FadeIn>
      <AnnouncementsAdminClient announcements={announcements} onChanged={load} />
    </FadeIn>
  );
}
