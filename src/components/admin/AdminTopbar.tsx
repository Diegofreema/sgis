
import { useState } from "react";
import { usePathname } from '@/lib/compat/navigation';
import { Menu, LogOut } from "lucide-react";
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
import { useUIStore } from "@/store/ui-store";
import { logout } from "@/lib/auth";
import type { UserProfile } from "@/types/auth";
import { getFullName } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  "/admin": "Overview",
  "/admin/applicants": "Applicants",
  "/admin/exams": "Examinations",
  "/admin/question-bank": "Question Bank",
  "/admin/announcements": "Announcements",
  "/admin/news": "News",
  "/admin/cms": "Content Management",
  "/admin/gallery": "Gallery",
  "/admin/testimonials": "Testimonials",
  "/admin/users": "Users",
  "/admin/settings": "Settings",
};

type Props = { profile: UserProfile };

export function AdminTopbar({ profile }: Props) {
  const { toggleSidebar } = useUIStore();
  const pathname = usePathname();
  const [logoutOpen, setLogoutOpen] = useState(false);

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
          <span className="text-xs text-muted-foreground hidden sm:block">
            {getFullName(profile.firstName, profile.lastName)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-xs"
            onClick={() => setLogoutOpen(true)}
          >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logout()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
