import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MessageSquareQuote, Pencil, Plus, Trash2 } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createTestimonial,
  deleteTestimonial,
  updateTestimonial,
} from "@/lib/admin";
import { formatDate } from "@/lib/utils";
import type { Testimonial } from "@/types/cms";

const schema = z.object({
  parentName: z.string().trim().min(1, "Name is required"),
  content: z.string().trim().min(1, "Content is required"),
  isPublished: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  testimonials: Testimonial[];
  onChanged: () => void;
};

export function TestimonialsAdminClient({ testimonials, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { parentName: "", content: "", isPublished: true },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ parentName: "", content: "", isPublished: true });
    setDialogOpen(true);
  }

  function openEdit(testimonial: Testimonial) {
    setEditing(testimonial);
    form.reset({
      parentName: testimonial.parentName,
      content: testimonial.content,
      isPublished: testimonial.isPublished,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const result = editing
      ? await updateTestimonial(editing.id, values)
      : await createTestimonial(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? "Testimonial updated." : "Testimonial created.");
    setDialogOpen(false);
    onChanged();
  }

  async function confirmDelete() {
    if (!deleting) return;

    setActionId(deleting.id);
    const result = await deleteTestimonial(deleting.id);
    setActionId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Testimonial deleted.");
    setDeleting(null);
    onChanged();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-h3 font-bold text-foreground">
            Parent Testimonials
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {testimonials.length} total
          </p>
        </div>
        <Button size="sm" className="gap-1.5 font-medium" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Testimonial
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {testimonials.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <MessageSquareQuote className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No testimonials yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {testimonial.parentName}
                      </p>
                      <Badge
                        variant={testimonial.isPublished ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {testimonial.isPublished ? "Published" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {testimonial.content}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      Created {formatDate(testimonial.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(testimonial)}
                      disabled={actionId === testimonial.id}
                      title="Edit testimonial"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(testimonial)}
                      disabled={actionId === testimonial.id}
                      title="Delete testimonial"
                    >
                      {actionId === testimonial.id ? (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? "Edit Testimonial" : "New Testimonial"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="parentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent name</FormLabel>
                    <FormControl>
                      <Input placeholder="Mrs. Ada Okoro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={7}
                        placeholder="What did the parent say?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="mb-0">Show on homepage</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Saving..."
                    : editing
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleting?.parentName}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === deleting?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={actionId === deleting?.id}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionId === deleting?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working...
                </>
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
