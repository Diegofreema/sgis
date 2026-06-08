"use client";

import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import type { UserProfile } from "@/types/auth";
import { getFullName } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  "/admin": "Overview",
  "/admin/applicants": "Applicants",
  "/admin/exams": "Examinations",
  "/admin/question-bank": "Question Bank",
  "/admin/payments": "Payments",
  "/admin/announcements": "Announcements",
  "/admin/cms": "Content Management",
  "/admin/gallery": "Gallery",
  "/admin/users": "Users",
  "/admin/settings": "Settings",
};

type Props = { profile: UserProfile };

export function AdminTopbar({ profile }: Props) {
  const { toggleSidebar } = useUIStore();
  const pathname = usePathname();

  const label =
    Object.entries(routeLabels)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => pathname.startsWith(key))?.[1] ?? "Admin";

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={toggleSidebar}>
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="font-serif font-semibold text-sm text-foreground">{label}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {getFullName(profile.firstName, profile.lastName)}
          </span>
        </div>
      </div>
    </header>
  );
}
