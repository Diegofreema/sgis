import { requireRole } from "@/lib/auth";
import { listAllAnnouncements } from "@/server/queries/cms.queries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/FadeIn";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus, Bell } from "lucide-react";

export default async function AnnouncementsPage() {
  await requireRole(["admin"]);
  const all = await listAllAnnouncements();

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-h3 font-bold text-foreground">Announcements</h1>
            <p className="text-muted-foreground text-sm mt-1">{all.length} total announcements</p>
          </div>
          <Button size="sm" className="gap-1.5 font-medium">
            <Plus className="h-4 w-4" />
            New Announcement
          </Button>
        </div>
      </FadeIn>

      <FadeIn>
        <Card>
          <CardContent className="p-0">
            {all.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Bell className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No announcements yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {all.map((ann) => (
                  <div key={ann.id} className="flex items-center justify-between px-6 py-4 gap-4">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{ann.title}</p>
                        {ann.isImportant && (
                          <span className="text-[10px] bg-destructive/10 text-destructive rounded px-1.5 py-0.5 font-medium shrink-0">
                            Important
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        Audience: {ann.audience} · {ann.publishedAt ? formatDate(ann.publishedAt.toISOString()) : "Not published"}
                      </p>
                    </div>
                    <Badge variant={ann.status === "published" ? "default" : "secondary"} className="text-xs capitalize shrink-0">
                      {ann.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
