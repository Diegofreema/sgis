"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updateUserRole } from "@/server/actions/admin.actions";
import { getInitials, formatDate } from "@/lib/utils";

type UserRow = {
  id: string;
  authUserId: string;
  role: "student" | "parent" | "admin";
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  parentProfileId: string | null;
  state?: string | null;
  lga?: string | null;
  createdAt: Date;
  applicationStatus: string | null;
  paymentStatus: string | null;
};

const ROLE_COLORS: Record<string, string> = {
  student: "bg-primary/10 text-primary",
  parent: "bg-muted text-muted-foreground",
  admin: "bg-warning/20 text-warning",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-success/10 text-success",
  submitted: "bg-primary/10 text-primary",
  under_review: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  pending_payment: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

type Props = { users: UserRow[] };

export function UsersAdminClient({ users: initialUsers }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  function toggleParent(id: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRoleChange(userId: string, newRole: "student" | "parent" | "admin") {
    setUpdatingId(userId);
    const result = await updateUserRole(userId, newRole);
    setUpdatingId(null);
    if (result.success) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success("Role updated.");
    } else {
      toast.error(result.error ?? "Failed to update role.");
    }
  }

  const q = search.toLowerCase();

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.firstName ?? "").toLowerCase().includes(q) ||
      (u.lastName ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Group: parents → their students
  const studentsByParent = new Map<string, UserRow[]>();
  for (const u of users) {
    if (u.role === "student" && u.parentProfileId) {
      const list = studentsByParent.get(u.parentProfileId) ?? [];
      list.push(u);
      studentsByParent.set(u.parentProfileId, list);
    }
  }

  // For "all" or "parent" view show parent-student tree
  // For "student" view show flat list
  // For "admin" view show flat list
  const showTree = roleFilter === "all" || roleFilter === "parent";
  const parents = filteredUsers.filter((u) => u.role === "parent");
  const admins = filteredUsers.filter((u) => u.role === "admin");
  const orphanStudents = filteredUsers.filter(
    (u) => u.role === "student" && (!u.parentProfileId || !users.find((p) => p.id === u.parentProfileId))
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

  function RoleActions({ user }: { user: UserRow }) {
    return (
      <Select
        value={user.role}
        onValueChange={(v) => handleRoleChange(user.id, v as "student" | "parent" | "admin")}
        disabled={updatingId === user.id}
      >
        <SelectTrigger className="w-32 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="student">Student</SelectItem>
          <SelectItem value="parent">Parent</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {users.length} registered · {parents.length} parent{parents.length !== 1 ? "s" : ""} · {users.filter((u) => u.role === "student").length} student{users.filter((u) => u.role === "student").length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="parent">Parents &amp; Students</SelectItem>
            <SelectItem value="student">Students only</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {/* Admin rows */}
        {admins.length > 0 && (showTree || roleFilter === "admin") && (
          <div>
            {admins.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3 gap-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <UserNameCell user={user} />
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={ROLE_COLORS["admin"]}>admin</Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDate(user.createdAt)}
                  </span>
                  <RoleActions user={user} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Parent + student tree */}
        {showTree && parents.length > 0 && (
          <div>
            {parents.map((parent) => {
              const children = studentsByParent.get(parent.id) ?? [];
              const isExpanded = expandedParents.has(parent.id);
              return (
                <div key={parent.id} className="border-b border-border last:border-0">
                  {/* Parent row */}
                  <div className="flex items-center justify-between px-4 py-3 gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      {children.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => toggleParent(parent.id)}
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      ) : (
                        <span className="w-6 shrink-0" />
                      )}
                      <UserNameCell user={parent} />
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {children.length > 0 && (
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {children.length} student{children.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      <Badge className={ROLE_COLORS["parent"]}>parent</Badge>
                      <span className="text-xs text-muted-foreground hidden md:block">
                        {formatDate(parent.createdAt)}
                      </span>
                      <RoleActions user={parent} />
                    </div>
                  </div>

                  {/* Student children */}
                  {isExpanded && children.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between px-4 py-2.5 gap-4 bg-muted/20 border-t border-border/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 pl-8">
                        <UserNameCell user={student} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {student.applicationStatus && (
                          <Badge className={`text-[10px] ${STATUS_COLORS[student.applicationStatus] ?? ""}`}>
                            app: {statusLabel(student.applicationStatus)}
                          </Badge>
                        )}
                        {student.paymentStatus && (
                          <Badge className={`text-[10px] ${STATUS_COLORS[student.paymentStatus] ?? ""}`}>
                            pay: {statusLabel(student.paymentStatus)}
                          </Badge>
                        )}
                        {student.state && (
                          <span className="text-xs text-muted-foreground hidden lg:block">
                            {student.state}
                          </span>
                        )}
                        <Badge className={ROLE_COLORS["student"]}>student</Badge>
                        <RoleActions user={student} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Orphan students (no parent) */}
        {(roleFilter === "student" || (showTree && orphanStudents.length > 0)) &&
          orphanStudents.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between px-4 py-3 gap-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <UserNameCell user={student} />
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {student.applicationStatus && (
                  <Badge className={`text-[10px] ${STATUS_COLORS[student.applicationStatus] ?? ""}`}>
                    app: {statusLabel(student.applicationStatus)}
                  </Badge>
                )}
                {student.paymentStatus && (
                  <Badge className={`text-[10px] ${STATUS_COLORS[student.paymentStatus] ?? ""}`}>
                    pay: {statusLabel(student.paymentStatus)}
                  </Badge>
                )}
                <Badge className={ROLE_COLORS["student"]}>student</Badge>
                <RoleActions user={student} />
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
