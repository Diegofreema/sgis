"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CMSRichTextEditor } from "@/components/cms/CMSRichTextEditor";
import { upsertCMSPage } from "@/server/actions/cms.actions";
import type { CMSPage } from "@/db/schema/cms";

type Props = {
  pageKey: string;
  pageLabel: string;
  existing: CMSPage | null;
};

export function CMSPageEditorClient({ pageKey, pageLabel, existing }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    (existing?.status as "draft" | "published" | "archived") ?? "draft"
  );
  const [saving, setSaving] = useState(false);

  async function handleSave(newStatus?: "draft" | "published" | "archived") {
    setSaving(true);
    const result = await upsertCMSPage({
      pageKey,
      title,
      body,
      status: newStatus ?? status,
    });
    setSaving(false);

    if (result.success) {
      setStatus(newStatus ?? status);
      toast.success(
        newStatus === "published" ? "Page published!" : "Draft saved."
      );
    } else {
      toast.error(result.error ?? "Failed to save page.");
    }
  }

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-success/20 text-success",
    archived: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/cms")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-foreground truncate">
              {pageLabel}
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {pageKey}
            </p>
          </div>
          <Badge className={statusColors[status] ?? ""}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave("published")}
            disabled={saving}
            className="gap-1.5 font-medium shadow-brand-sm"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {/* Page title input */}
      <div className="space-y-1.5">
        <Label htmlFor="page-title" className="text-sm font-medium">
          Page Title
        </Label>
        <Input
          id="page-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Enter ${pageLabel} title…`}
          className="text-base font-medium"
        />
      </div>

      {/* Rich text editor */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Content</Label>
        <CMSRichTextEditor
          content={body}
          onChange={setBody}
          placeholder={`Write ${pageLabel} content here…`}
          className="min-h-125"
        />
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSave("archived")}
          disabled={saving}
          className="text-muted-foreground"
        >
          Archive Page
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave("published")}
            disabled={saving}
            className="gap-1.5 font-medium shadow-brand-sm"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
