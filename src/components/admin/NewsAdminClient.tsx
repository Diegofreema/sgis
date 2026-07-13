import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlignLeft,
  Bold,
  CalendarDays,
  Heading2,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Quote,
  Trash2,
  UnderlineIcon,
  Undo2,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createNewsArticle,
  deleteNewsArticle,
  updateNewsArticle,
} from "@/lib/admin";
import { cn, formatDate } from "@/lib/utils";
import type { NewsArticle } from "@/types/cms";

function htmlText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
}

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  excerpt: z.string().trim().optional(),
  body: z.string().refine((value) => htmlText(value).length > 0, "Article body is required"),
  author: z.string().trim().optional(),
  featuredImageUrl: z.string().trim().optional(),
  status: z.enum(["draft", "published", "archived"]),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  articles: NewsArticle[];
  onChanged: () => void;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
};

function ToolbarButton({ label, active, disabled, children, onClick }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      className={cn("h-8 w-8 rounded-md", active && "bg-primary/10 text-primary")}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function RichTextToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  function setLink() {
    const previous = editor?.getAttributes("link").href as string | undefined;
    const href = window.prompt("Paste link URL", previous ?? "");
    if (href === null) return;
    if (!href.trim()) {
      editor?.chain().focus().unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  function addImage() {
    const src = window.prompt("Paste image URL");
    if (src?.trim()) editor?.chain().focus().setImage({ src }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
      <ToolbarButton label="Paragraph" onClick={() => editor.chain().focus().setParagraph().run()}>
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-6 w-px bg-border" />
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-6 w-px bg-border" />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-6 w-px bg-border" />
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Image" onClick={addImage}>
        <Image className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const extensions = useMemo(
    () => [
      StarterKit,
      Underline,
      ImageExtension,
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Write the full news article..." }),
    ],
    [],
  );
  const editor = useEditor({
    extensions,
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[340px] px-5 py-4 outline-none prose prose-neutral max-w-none dark:prose-invert",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return;
    editor.commands.setContent(value || "");
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

export function NewsAdminClient({ articles, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [deleting, setDeleting] = useState<NewsArticle | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      excerpt: "",
      body: "",
      author: "",
      featuredImageUrl: "",
      status: "draft",
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      title: "",
      excerpt: "",
      body: "",
      author: "",
      featuredImageUrl: "",
      status: "draft",
    });
    setDialogOpen(true);
  }

  function openEdit(article: NewsArticle) {
    setEditing(article);
    form.reset({
      title: article.title,
      excerpt: article.excerpt ?? "",
      body: article.body ?? "",
      author: article.author ?? "",
      featuredImageUrl: article.featuredImageUrl ?? "",
      status: article.status,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const result = editing
      ? await updateNewsArticle(editing.id, values)
      : await createNewsArticle(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? "News updated." : "News created.");
    setDialogOpen(false);
    onChanged();
  }

  async function confirmDelete() {
    if (!deleting) return;

    setActionId(deleting.id);
    const result = await deleteNewsArticle(deleting.id);
    setActionId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("News deleted.");
    setDeleting(null);
    onChanged();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-h3 font-bold text-foreground">News</h1>
          <p className="mt-1 text-sm text-muted-foreground">{articles.length} total</p>
        </div>
        <Button size="sm" className="gap-1.5 font-medium" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Article
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {articles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Newspaper className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No news yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {articles.map((article) => (
                <div key={article.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{article.title}</p>
                      <Badge
                        variant={article.status === "published" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {article.status}
                      </Badge>
                    </div>
                    {article.excerpt ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{article.excerpt}</p>
                    ) : null}
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                      <CalendarDays className="h-3 w-3" />
                      {article.publishedAt ? formatDate(article.publishedAt) : "Not published"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(article)}
                      disabled={actionId === article.id}
                      title="Edit news"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(article)}
                      disabled={actionId === article.id}
                      title="Delete news"
                    >
                      {actionId === article.id ? (
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
        <DialogContent className="max-h-[92vh] w-[min(96vw,1120px)] max-w-none overflow-y-auto p-0 sm:max-w-[1120px]">
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editing ? "Edit News Article" : "Create News Article"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input className="h-11 text-base font-medium" placeholder="News headline" {...field} />
                      </FormControl>
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
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input placeholder="Sankt Georg International School" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featuredImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short summary</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Brief summary shown on news cards" {...field} />
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
                    <FormLabel>Article body</FormLabel>
                    <FormControl>
                      <RichTextEditor value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t border-border bg-background/95 p-5 backdrop-blur">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : editing ? "Update Article" : "Create Article"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete news article?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleting?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId === deleting?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={actionId === deleting?.id}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionId === deleting?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
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
