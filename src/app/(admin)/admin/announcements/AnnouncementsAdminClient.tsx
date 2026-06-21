"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Bell, Pencil, Plus } from "lucide-react";
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
import { formatDate } from "@/lib/utils";
import { createAnnouncement, updateAnnouncement } from "@/server/actions/admin.actions";
import type { Announcement } from "@/db/schema/announcements";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  excerpt: z.string().optional(),
  audience: z.enum(["public", "students", "parents", "applicants", "admins"]),
  isImportant: z.boolean(),
  status: z.enum(["draft", "published"]),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  announcements: Announcement[];
};

export function AnnouncementsAdminClient({ announcements: initial }: Props) {
  const [items, setItems] = useState<Announcement[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      body: "",
      excerpt: "",
      audience: "public",
      isImportant: false,
      status: "draft",
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      title: "",
      body: "",
      excerpt: "",
      audience: "public",
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
      audience: ann.audience as FormValues["audience"],
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
      setItems((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? { ...a, ...values, updatedAt: new Date() }
            : a
        )
      );
      toast.success("Announcement updated.");
    } else {
      const result = await createAnnouncement(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Announcement created.");
      // Refetch by reload (simpler than managing optimistic insert with unknown id)
      window.location.reload();
    }
    setDialogOpen(false);
  }

  async function archive(id: string) {
    const result = await updateAnnouncement(id, { status: "archived" });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "archived" as const } : a))
    );
    toast.success("Archived.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-h3 font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} total</p>
        </div>
        <Button size="sm" className="gap-1.5 font-medium" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((ann) => (
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
                      Audience: {ann.audience} ·{" "}
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
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {ann.status !== "archived" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => archive(ann.id)}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? "Edit Announcement" : "New Announcement"}
            </DialogTitle>
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
                      <Input placeholder="Short summary" {...field} />
                    </FormControl>
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
                      <Textarea placeholder="Announcement content…" rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="students">Students</SelectItem>
                          <SelectItem value="parents">Parents</SelectItem>
                          <SelectItem value="applicants">Applicants</SelectItem>
                          <SelectItem value="admins">Admins</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
    </div>
  );
}
