"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  CheckSquare,
  ImageIcon,
  Loader2,
  Plus,
  Square,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createGalleryItemRecords,
  deleteAllGalleryItems,
  deleteGalleryItem,
  deleteGalleryItems,
  deleteGalleryUpload,
  uploadGalleryImage,
} from "@/server/actions/admin.actions";
import type { GalleryItem } from "@/db/schema/gallery";

type DeleteTarget =
  | { type: "single"; id: string; title: string }
  | { type: "selected" }
  | { type: "all" }
  | null;

type Props = {
  initialItems: GalleryItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  start: number;
  end: number;
};

export function GalleryAdminClient({
  initialItems,
  totalItems,
  currentPage,
  totalPages,
  start,
  end,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const itemIds = initialItems.map((item) => item.id);
  const allPageSelected = itemIds.length > 0 && itemIds.every((id) => selected.has(id));
  const selectedCount = selected.size;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 1024 * 1024,
    multiple: true,
    noClick: true,
    onDrop: (acceptedFiles, rejections) => {
      const next = [...files, ...acceptedFiles];
      const deduped = Array.from(
        new Map(next.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file])).values()
      );
      setFiles(deduped);

      for (const rejection of rejections) {
        const tooLarge = rejection.errors.some((error) => error.code === "file-too-large");
        const invalidType = rejection.errors.some((error) => error.code === "file-invalid-type");
        toast.error(
          tooLarge
            ? `${rejection.file.name} is bigger than 1MB.`
            : invalidType
            ? `${rejection.file.name} must be JPG, PNG, or WebP.`
            : `Could not add ${rejection.file.name}.`
        );
      }
    },
  });

  function resetForm() {
    setFiles([]);
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelected((current) => {
      if (allPageSelected) {
        const next = new Set(current);
        itemIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...current, ...itemIds]);
    });
  }

  async function handleAdd() {
    if (files.length === 0) {
      toast.error("Select at least one image.");
      return;
    }

    setSaving(true);

    const results = await Promise.allSettled(
      files.map(async (file, idx) => {
        const formData = new FormData();
        formData.set("image", file);
        const result = await uploadGalleryImage(formData);
        if (!result.success) {
          throw new Error(result.error ?? `Could not upload ${file.name}.`);
        }
        return { ...result.data, _idx: idx };
      })
    );

    const succeeded = results
      .filter(
        (r): r is PromiseFulfilledResult<{ path: string; url: string; _idx: number }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    const failedCount = results.length - succeeded.length;

    if (failedCount > 0) {
      const uploadedPaths = succeeded.map((r) => r.path);
      for (const path of uploadedPaths) {
        try {
          await deleteGalleryUpload(path);
        } catch {}
      }

      setSaving(false);
      toast.error(
        failedCount === results.length
          ? "Upload failed for all images."
          : `${failedCount} of ${results.length} images failed to upload.`
      );
      return;
    }

    const records = succeeded.map((r) => {
      const file = files[r._idx];
      const title =
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim() || "Gallery Photo";
      return { imageUrl: r.url, title };
    });

    const dbResult = await createGalleryItemRecords(records);

    if (!dbResult.success) {
      const uploadedPaths = succeeded.map((r) => r.path);
      for (const path of uploadedPaths) {
        try {
          await deleteGalleryUpload(path);
        } catch {}
      }
    }

    setSaving(false);
    if (dbResult.success) {
      toast.success(
        dbResult.data.count === 1
          ? "Gallery item added."
          : `${dbResult.data.count} gallery items added.`
      );
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(dbResult.error ?? "Failed to add item.");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    const result =
      deleteTarget.type === "all"
        ? await deleteAllGalleryItems()
        : deleteTarget.type === "selected"
        ? await deleteGalleryItems(Array.from(selected))
        : await deleteGalleryItem(deleteTarget.id);
    setDeleting(false);

    if (result.success) {
      const deleted =
        "data" in result && result.data && "deleted" in result.data ? result.data.deleted : 1;
      toast.success(deleted === 1 ? "Item removed." : `${deleted} items removed.`);
      setSelected(new Set());
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete item.");
    }
  }

  const deleteDescription =
    deleteTarget?.type === "all"
      ? `This will permanently delete all ${totalItems} gallery image${
          totalItems !== 1 ? "s" : ""
        }. This cannot be undone.`
      : deleteTarget?.type === "selected"
      ? `This will permanently delete ${selectedCount} selected image${
          selectedCount !== 1 ? "s" : ""
        }. This cannot be undone.`
      : deleteTarget?.type === "single"
      ? `This will permanently delete "${deleteTarget.title}". This cannot be undone.`
      : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Gallery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage school photo gallery. {totalItems} item
            {totalItems !== 1 ? "s" : ""} total.
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
              <DialogTitle className="font-serif">Upload Gallery Images</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Images *</Label>
                <div
                  {...getRootProps()}
                  className={`rounded-xl border border-dashed p-5 text-center transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Drag images here or{" "}
                    <button
                      type="button"
                      onClick={open}
                      className="text-primary underline underline-offset-4"
                    >
                      choose from device
                    </button>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG, WebP. Up to 1MB each. Multiple images allowed.
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {files.map((file) => {
                      const key = `${file.name}-${file.size}-${file.lastModified}`;
                      return (
                      <div key={key} className="relative rounded-lg border bg-muted p-2">
                        <div className="flex aspect-square flex-col items-center justify-center gap-2 text-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          <p className="line-clamp-2 text-xs font-medium">{file.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFiles((current) =>
                              current.filter(
                                (entry) =>
                                  `${entry.name}-${entry.size}-${entry.lastModified}` !== key
                              )
                            )
                          }
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
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
      {totalItems > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Showing {start}-{end} of {totalItems} · Page {currentPage} of {totalPages}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={toggleSelectPage}
              disabled={deleting}
            >
              {allPageSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {allPageSelected ? "Deselect page" : "Select page"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setDeleteTarget({ type: "selected" })}
              disabled={selectedCount === 0 || deleting}
            >
              <Trash2 className="h-4 w-4" />
              Delete selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => setDeleteTarget({ type: "all" })}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              Delete all
            </Button>
          </div>
        </div>
      ) : null}

      {initialItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-foreground">No gallery items yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add photos to the school gallery.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {initialItems.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-xl border bg-card ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
              >
                <button
                  type="button"
                  className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-background/90 shadow-sm transition-colors hover:bg-background"
                  onClick={() => toggleSelect(item.id)}
                  aria-label={isSelected ? "Deselect image" : "Select image"}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <div className="space-y-1 p-3">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() =>
                    setDeleteTarget({ type: "single", id: item.id, title: item.title })
                  }
                  disabled={deleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "all"
                ? "Delete all gallery images?"
                : deleteTarget?.type === "selected"
                ? "Delete selected images?"
                : "Delete gallery image?"}
            </AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || (deleteTarget?.type === "selected" && selectedCount === 0)}
              onClick={handleConfirmDelete}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
