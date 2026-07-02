"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  createdAt: Date;
};

type Props = { users: UserRow[] };

export function UsersAdminClient({ users: initialUsers }: Props) {
  const [search, setSearch] = useState("");

  const q = search.toLowerCase();

  const filteredUsers = initialUsers.filter((u) =>
    !q ||
    u.email.toLowerCase().includes(q) ||
    (u.firstName ?? "").toLowerCase().includes(q) ||
    (u.lastName ?? "").toLowerCase().includes(q)
  );

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
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {initialUsers.length} admin{initialUsers.length !== 1 ? "s" : ""}
        </p>
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
