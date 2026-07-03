"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Plus, Trash2, ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createGalleryItemRecords, deleteGalleryItem } from "@/server/actions/admin.actions";
import { uploadGalleryImage, deleteStorageFile } from "@/lib/storage";
import type { GalleryItem } from "@/db/schema/gallery";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

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

  async function handleAdd() {
    if (files.length === 0) {
      toast.error("Select at least one image.");
      return;
    }

    setSaving(true);

    const results = await Promise.allSettled(
      files.map((file, idx) =>
        uploadGalleryImage(file).then((r) => ({ ...r, _idx: idx }))
      )
    );

    const succeeded = results
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof uploadGalleryImage>> & { _idx: number }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    const failedCount = results.length - succeeded.length;

    if (failedCount > 0) {
      const uploadedPaths = succeeded.map((r) => r.path);
      for (const path of uploadedPaths) {
        try {
          await deleteStorageFile("gallery", path);
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
          await deleteStorageFile("gallery", path);
        } catch {}
      }
    }

    setSaving(false);
    if (dbResult.success) {
      toast.success(
        dbResult.data.items.length === 1
          ? "Gallery item added."
          : `${dbResult.data.items.length} gallery items added.`
      );
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(dbResult.error ?? "Failed to add item.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteGalleryItem(id);
    setDeletingId(null);
    if (result.success) {
      toast.success("Item removed.");
      router.refresh();
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
        <div className="text-xs text-muted-foreground">
          Showing {start}-{end} of {totalItems} · Page {currentPage} of {totalPages}
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
          {initialItems.map((item) => (
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
                <p className="text-sm font-medium truncate">{item.title}</p>
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
