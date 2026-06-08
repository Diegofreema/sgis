import { listApplications } from "@/server/queries/applications.queries";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/animations/FadeIn";
import { APPLICATION_STATUS_LABELS } from "@/constants/statuses";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Eye, Search } from "lucide-react";

export default async function ApplicantsPage() {
  await requireRole(["admin"]);
  const apps = await listApplications();

  function statusVariant(status: string): "default" | "destructive" | "secondary" {
    if (status === "approved") return "default";
    if (status === "rejected") return "destructive";
    return "secondary";
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-h3 font-bold text-foreground">Applicants</h1>
            <p className="text-muted-foreground text-sm mt-1">{apps.length} total applications</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search applicants…" className="pl-9 h-8 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No applications found.</p>
            ) : (
              <div className="divide-y divide-border">
                {apps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between px-6 py-4 gap-4 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Application #{app.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Class: {app.intendedClass} · Applied {formatDate(app.createdAt.toISOString())}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={statusVariant(app.status)} className="capitalize text-xs">
                        {APPLICATION_STATUS_LABELS[app.status as keyof typeof APPLICATION_STATUS_LABELS]}
                      </Badge>
                      <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Link href={`/admin/applicants/${app.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
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
