"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  FileText,
  CreditCard,
  BookOpen,
  Trophy,
  GraduationCap,
  LogOut,
  ChevronRight,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getFullName, getInitials } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { logout } from "@/server/actions/auth.actions";
import type { UserProfile } from "@/types/auth";

type Props = { profile: UserProfile };

export function DashboardSidebar({ profile }: Props) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const fullName = getFullName(profile.firstName, profile.lastName);
  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/profile", label: "My Profile", icon: User },
    ...(profile.role === "parent"
      ? [{ href: "/dashboard/students", label: "My Students", icon: Users }]
      : []),
    { href: "/dashboard/application", label: "Application", icon: FileText },
    { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/exam", label: "Entrance Exam", icon: BookOpen },
    { href: "/dashboard/results", label: "Results", icon: Trophy },
  ];

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-serif font-semibold text-xs text-sidebar-foreground leading-tight">
            Sankt Georg
          </p>
          <p className="text-[9px] text-sidebar-foreground/50 uppercase tracking-wide leading-tight">
            Student Portal
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 mb-1">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile.avatarUrl ?? undefined} alt={fullName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{fullName}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate capitalize">
              {profile.role}
            </p>
          </div>
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 h-8 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
