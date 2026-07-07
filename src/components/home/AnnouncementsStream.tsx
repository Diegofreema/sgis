import { useEffect, useState } from "react";
import { getActiveAnnouncement } from "@/lib/queries";
import { AnnouncementBanner } from "@/components/public/AnnouncementBanner";
import type { Announcement } from "@/types/cms";

/** Client stream — active announcement banner, or nothing. */
export function AnnouncementsStream() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let active = true;
    getActiveAnnouncement()
      .then((a) => active && setAnnouncement(a))
      .catch((error) => console.error("[AnnouncementsStream]", error));
    return () => {
      active = false;
    };
  }, []);

  if (!announcement) return null;
  return <AnnouncementBanner key={announcement.id} announcement={announcement} />;
}
