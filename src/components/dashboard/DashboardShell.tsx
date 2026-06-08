"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { DashboardSidebar } from "./DashboardSidebar";
import { useUIStore } from "@/store/ui-store";
import type { UserProfile } from "@/types/auth";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardShellProps = {
  children: React.ReactNode;
  profile: UserProfile;
};

export function DashboardShell({ children, profile }: DashboardShellProps) {
  const setProfile = useAuthStore((s) => s.setProfile);
  const { sidebarOpen, toggleSidebar } = useUIStore();

  // Hydrate auth store from server-provided profile
  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <DashboardSidebar profile={profile} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/95 backdrop-blur md:hidden">
          <div className="max-w-7xl mx-auto w-full h-full flex items-center gap-3 px-4">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
            <p className="font-serif font-semibold text-sm text-foreground">Sankt Georg Portal</p>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}
