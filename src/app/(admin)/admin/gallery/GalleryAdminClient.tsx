"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ImageIcon, Loader2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGalleryItem, deleteGalleryItem } from "@/server/actions/admin.actions";
import type { GalleryItem } from "@/db/schema/gallery";

type Props = {
  initialItems: GalleryItem[];
};

export function GalleryAdminClient({ initialItems }: Props) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!imageUrl.trim()) { toast.error("Image URL is required."); return; }
    if (!title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    const result = await createGalleryItem({
      imageUrl: imageUrl.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      visibility,
      sortOrder: items.length,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Gallery item added.");
      setDialogOpen(false);
      setImageUrl(""); setTitle(""); setDescription(""); setCategory("");
      setVisibility("public");
      // Optimistic: reload is done on next visit; for now refresh
      window.location.reload();
    } else {
      toast.error(result.error ?? "Failed to add item.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteGalleryItem(id);
    setDeletingId(null);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item removed.");
    } else {
      toast.error(result.error ?? "Failed to delete item.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Gallery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage school photo gallery. {items.length} item
            {items.length !== 1 ? "s" : ""} total.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 font-medium shadow-brand-sm">
              <Plus className="h-4 w-4" />
              Add Photo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Add Gallery Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Image URL *</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Photo title…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Sports"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Visibility</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v: string) =>
                      setVisibility(v as "public" | "private")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Gallery grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-foreground">No gallery items yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add photos to the school gallery.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-border overflow-hidden bg-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className="p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 shrink-0"
                  >
                    {item.visibility === "public" ? (
                      <Globe className="h-3 w-3 mr-1" />
                    ) : (
                      <Lock className="h-3 w-3 mr-1" />
                    )}
                    {item.visibility}
                  </Badge>
                </div>
                {item.category && (
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                )}
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
