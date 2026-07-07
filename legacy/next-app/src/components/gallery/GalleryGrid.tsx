"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { CheckSquare, Loader2, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { FadeIn } from "@/components/animations/FadeIn";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/animations/StaggerChildren";
import {
  deleteGalleryItems,
  deleteAllGalleryItems,
} from "@/server/actions/admin.actions";
import type { GalleryItem } from "@/db/schema/gallery";

type ActionType = "selected" | "all" | null;

type Props = {
  items: GalleryItem[];
  isAdmin: boolean;
};

export function GalleryGrid({ items, isAdmin }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<ActionType>(null);

  const itemIds = items.map((item) => item.id);
  const allSelected = itemIds.length > 0 && selected.size === itemIds.length;

  const toggleSelectAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(itemIds));
  }, [allSelected, itemIds]);

  const toggleItem = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function handleDeleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setDeleting(true);
    const result = await deleteGalleryItems(ids);
    setDeleting(false);
    if (result.success) {
      toast.success(
        result.data.deleted === 1 ? "Item deleted." : `${result.data.deleted} items deleted.`
      );
      setSelected(new Set());
      setConfirmOpen(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDeleteAll() {
    setDeleting(true);
    const result = await deleteAllGalleryItems();
    setDeleting(false);
    if (result.success) {
      toast.success(
        result.data.deleted === 1
          ? "1 item deleted."
          : `${result.data.deleted} items deleted.`
      );
      setSelected(new Set());
      setConfirmOpen(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      {isAdmin && items.length > 0 && (
        <FadeIn className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-sm"
            onClick={toggleSelectAll}
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {allSelected ? "Deselect all" : "Select all"} ({itemIds.length})
          </Button>

          <div className="h-5 w-px bg-border" />

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-sm"
            disabled={selected.size === 0 || deleting}
            onClick={() => setConfirmOpen("selected")}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete selected{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-sm text-destructive hover:text-destructive"
            disabled={deleting}
            onClick={() => setConfirmOpen("all")}
          >
            <Trash2 className="h-4 w-4" />
            Delete all ({itemIds.length})
          </Button>
        </FadeIn>
      )}

      <StaggerChildren className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {items.map((item) => {
          const isSelected = selected.has(item.id);
          return (
            <StaggerItem key={item.id}>
              <div className="break-inside-avoid rounded-xl overflow-hidden bg-muted group">
                <div className="relative">
                  {isAdmin && (
                    <button
                      type="button"
                      className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background transition-colors"
                      onClick={() => toggleItem(item.id)}
                      aria-label={isSelected ? "Deselect" : "Select"}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    width={600}
                    height={400}
                    unoptimized
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerChildren>

      <AlertDialog
        open={confirmOpen !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmOpen === "all" ? "Delete all gallery items?" : "Delete selected items?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOpen === "all"
                ? `This will permanently delete all ${itemIds.length} gallery item${itemIds.length !== 1 ? "s" : ""} and their images. This cannot be undone.`
                : `This will permanently delete ${selected.size} selected item${selected.size !== 1 ? "s" : ""} and their images. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => {
                if (confirmOpen === "all") {
                  handleDeleteAll();
                } else if (confirmOpen === "selected") {
                  handleDeleteSelected();
                }
              }}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
