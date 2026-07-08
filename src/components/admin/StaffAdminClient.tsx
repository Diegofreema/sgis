import { useState } from 'react';
import { toast } from 'sonner';
import { ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  createStaffMember,
  deleteGalleryUpload,
  deleteStaffMember,
  updateStaffMember,
  uploadStaffImage,
} from '@/lib/admin';
import type { StaffMember } from '@/types/cms';

type Props = {
  staff: StaffMember[];
  onChanged: () => void;
};

type FormState = {
  name: string;
  role: string;
  sortOrder: string;
  isActive: boolean;
  image: File | null;
};

const emptyForm: FormState = {
  name: '',
  role: '',
  sortOrder: '0',
  isActive: true,
  image: null,
};

export function StaffAdminClient({ staff, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<StaffMember | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditing(member);
    setForm({
      name: member.name,
      role: member.role,
      sortOrder: String(member.sortOrder),
      isActive: member.isActive,
      image: null,
    });
    setDialogOpen(true);
  }

  async function save() {
    const name = form.name.trim();
    const role = form.role.trim();
    if (!name || !role) {
      toast.error('Name and role are required.');
      return;
    }
    if (!editing && !form.image) {
      toast.error('Image is required.');
      return;
    }

    setSaving(true);
    let imageUrl: string | undefined;
    let uploadedPath: string | undefined;
    if (form.image) {
      const data = new FormData();
      data.set('image', form.image);
      const uploaded = await uploadStaffImage(data);
      if (!uploaded.success) {
        setSaving(false);
        toast.error(uploaded.error ?? 'Image upload failed.');
        return;
      }
      imageUrl = uploaded.data.url;
      uploadedPath = uploaded.data.path;
    }

    const payload = {
      name,
      role,
      imageUrl,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    };
    const result = editing
      ? await updateStaffMember(editing.id, payload)
      : await createStaffMember({ ...payload, imageUrl: imageUrl ?? '' });

    setSaving(false);
    if (!result.success) {
      if (uploadedPath) await deleteGalleryUpload(uploadedPath);
      toast.error(result.error ?? 'Could not save staff member.');
      return;
    }
    toast.success(editing ? 'Staff member updated.' : 'Staff member added.');
    setDialogOpen(false);
    onChanged();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    const result = await deleteStaffMember(deleting.id);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? 'Could not delete staff member.');
      return;
    }
    toast.success('Staff member deleted.');
    setDeleting(null);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-h3 font-bold text-foreground">
            Staff
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage staff shown on About page. {staff.length} total.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 font-medium" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No staff members yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <article
              key={member.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <img
                src={member.imageUrl}
                alt={member.name}
                className="aspect-4/3 w-full object-cover"
                loading="lazy"
              />
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.name}
                    </p>
                    <Badge variant={member.isActive ? 'default' : 'secondary'}>
                      {member.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.role}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sort order: {member.sortOrder}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(member)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDeleting(member)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editing ? 'Edit Staff Member' : 'Add Staff Member'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, name: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="staff-role">Role</Label>
              <Input
                id="staff-role"
                value={form.role}
                onChange={(e) =>
                  setForm((current) => ({ ...current, role: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="staff-image">Image</Label>
              <Input
                id="staff-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    image: e.target.files?.[0] ?? null,
                  }))
                }
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Leave image empty to keep current photo.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="staff-sort">Sort Order</Label>
              <Input
                id="staff-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: e.target.value,
                  }))
                }
              />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm">
              Show on About page
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleting?.name}. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
              onClick={confirmDelete}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
