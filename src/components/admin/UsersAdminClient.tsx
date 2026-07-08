import { useState } from "react";
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { createAdminUser } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getInitials, formatDate } from "@/lib/utils";

type UserRow = {
  id: string;
  authUserId: string;
  role: "admin";
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  state?: string | null;
  lga?: string | null;
  createdAt: string;
};

type Props = { users: UserRow[]; onCreated?: () => void };

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", password: "" };

export function UsersAdminClient({ users: initialUsers, onCreated }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const q = search.toLowerCase();

  const filteredUsers = initialUsers.filter((u) =>
    !q ||
    u.email.toLowerCase().includes(q) ||
    (u.firstName ?? "").toLowerCase().includes(q) ||
    (u.lastName ?? "").toLowerCase().includes(q)
  );

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      toast.error("Enter a valid email.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    const result = await createAdminUser({
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Admin account created.");
    setForm(EMPTY_FORM);
    setOpen(false);
    onCreated?.();
  }

  function UserNameCell({ user }: { user: UserRow }) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {getInitials(`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim())}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name || "—"}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {initialUsers.length} admin{initialUsers.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4" />
              Add admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add admin</DialogTitle>
              <DialogDescription>
                Creates a new admin account. Share the password securely — they should change it
                after first sign-in.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-first">First name</Label>
                  <Input
                    id="admin-first"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-last">Last name</Label>
                  <Input
                    id="admin-last"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-phone">Phone (optional)</Label>
                <Input
                  id="admin-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password">Temporary password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between px-4 py-3 gap-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
          >
            <UserNameCell user={user} />
            <div className="flex items-center gap-3 shrink-0">
              <Badge className="bg-warning/20 text-warning">admin</Badge>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
