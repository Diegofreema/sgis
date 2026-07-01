"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Bell, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ANNOUNCEMENT_BODY_WORD_LIMIT,
  ANNOUNCEMENT_EXCERPT_WORD_LIMIT,
  ANNOUNCEMENT_TITLE_WORD_LIMIT,
  countWords,
  getAnnouncementLengthIssues,
} from "@/lib/announcements";
import { formatDate } from "@/lib/utils";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/server/actions/admin.actions";
import type { Announcement } from "@/db/schema/announcements";

const schema = z
  .object({
    title: z.string().min(1, "Title is required"),
    body: z.string().min(1, "Body is required"),
    excerpt: z.string().optional(),
    isImportant: z.boolean(),
    status: z.enum(["draft", "published"]),
  })
  .superRefine((values, ctx) => {
    for (const issue of getAnnouncementLengthIssues(values)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [issue.field],
        message: issue.message,
      });
    }
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  announcements: Announcement[];
};

export function AnnouncementsAdminClient({ announcements: initial }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    announcement: Announcement;
    type: "archive" | "delete";
  } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      body: "",
      excerpt: "",
      isImportant: false,
      status: "draft",
    },
  });
  const title = useWatch({ control: form.control, name: "title" });
  const excerpt = useWatch({ control: form.control, name: "excerpt" });
  const body = useWatch({ control: form.control, name: "body" });

  function openCreate() {
    setEditing(null);
    form.reset({
      title: "",
      body: "",
      excerpt: "",
      isImportant: false,
      status: "draft",
    });
    setDialogOpen(true);
  }

  function openEdit(ann: Announcement) {
    setEditing(ann);
    form.reset({
      title: ann.title,
      body: ann.body,
      excerpt: ann.excerpt ?? "",
      isImportant: ann.isImportant,
      status: (ann.status === "archived" ? "draft" : ann.status) as "draft" | "published",
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    if (editing) {
      const result = await updateAnnouncement(editing.id, values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Announcement updated.");
    } else {
      const result = await createAnnouncement(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Announcement created.");
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function archive(announcement: Announcement) {
    setActionId(announcement.id);
    const result = await updateAnnouncement(announcement.id, { status: "archived" });
    setActionId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Archived.");
    router.refresh();
  }

  async function remove(announcement: Announcement) {
    setActionId(announcement.id);
    const result = await deleteAnnouncement(announcement.id);
    setActionId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Announcement deleted.");
    router.refresh();
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;

    const current = pendingAction;
    if (current.type === "archive") {
      await archive(current.announcement);
    } else {
      await remove(current.announcement);
    }
    setPendingAction(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-h3 font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground text-sm mt-1">{initial.length} total</p>
        </div>
        <Button size="sm" className="gap-1.5 font-medium" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {initial.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {initial.map((ann) => (
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
                    <p className="text-xs text-muted-foreground">
                      Public announcement ·{" "}
                      {ann.publishedAt ? formatDate(ann.publishedAt.toISOString()) : "Not published"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={ann.status === "published" ? "default" : "secondary"}
                      className="text-xs capitalize"
                    >
                      {ann.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(ann)}
                      disabled={actionId === ann.id}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {ann.status !== "archived" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => setPendingAction({ announcement: ann, type: "archive" })}
                        disabled={actionId === ann.id}
                      >
                        {actionId === ann.id && pendingAction?.type === "archive" ? "Archiving..." : "Archive"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setPendingAction({ announcement: ann, type: "delete" })}
                      disabled={actionId === ann.id}
                      title="Delete announcement"
                    >
                      {actionId === ann.id && pendingAction?.type === "delete" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? "Edit Announcement" : "New Announcement"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Only one public announcement can be live at a time. Keep notices short, longer content should go under News.
            </p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Announcement title" {...field} />
                    </FormControl>
                    <FormDescription>
                      {countWords(title)} / {ANNOUNCEMENT_TITLE_WORD_LIMIT} words
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Short summary for the public banner"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {countWords(excerpt)} / {ANNOUNCEMENT_EXCERPT_WORD_LIMIT} words
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Announcement content…"
                        rows={12}
                        className="min-h-64 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {countWords(body)} / {ANNOUNCEMENT_BODY_WORD_LIMIT} words. If this needs more room, publish it as News instead.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Publishing this announcement replaces the one currently live.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isImportant"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="mb-0">Mark as important</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving…" : editing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "archive" ? "Archive announcement?" : "Delete announcement?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "archive"
                ? `Archive "${pendingAction.announcement.title}"? It will be removed from the public site until published again.`
                : `Delete "${pendingAction?.announcement.title}"? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === pendingAction?.announcement.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingAction}
              disabled={actionId === pendingAction?.announcement.id}
              className={pendingAction?.type === "delete" ? "bg-destructive hover:bg-destructive/90" : undefined}
            >
              {actionId === pendingAction?.announcement.id ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Working...</>
              ) : pendingAction?.type === "archive" ? (
                "Archive"
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
