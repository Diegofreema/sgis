"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { useUIStore } from "@/store/ui-store";
import type { UserProfile } from "@/types/auth";

type Props = {
  children: React.ReactNode;
  profile: UserProfile;
};

export function AdminShell({ children, profile }: Props) {
  const setProfile = useAuthStore((s) => s.setProfile);
  const { sidebarOpen } = useUIStore();

  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <AdminSidebar profile={profile} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar profile={profile} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/40 md:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
