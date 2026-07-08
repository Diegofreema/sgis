
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getFullName, getInitials } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import type { UserProfile } from '@/types/auth';
import {
  Bell,
  BookOpen,
  GraduationCap,
  HelpCircle,
  Image,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserRound,
  UserCog,
  Users,
} from 'lucide-react';
import Link from '@/lib/compat/link';
import { usePathname } from '@/lib/compat/navigation';

const adminNavItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/applicants', label: 'Applicants', icon: Users },
  { href: '/admin/exams', label: 'Examinations', icon: BookOpen },
  { href: '/admin/question-bank', label: 'Question Bank', icon: HelpCircle },
  // { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: '/admin/announcements', label: 'Announcements', icon: Bell },
  // { href: '/admin/cms', label: 'CMS', icon: FileEdit },
  { href: '/admin/gallery', label: 'Gallery', icon: Image },
  { href: '/admin/staff', label: 'Staff', icon: UserRound },
  { href: '/admin/users', label: 'Users', icon: UserCog },
  { href: '/admin/activity', label: 'Activity Log', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

type Props = { profile: UserProfile };

export function AdminSidebar({ profile }: Props) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const fullName = getFullName(profile.firstName, profile.lastName);

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 md:relative md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <GraduationCap className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="font-serif font-semibold text-xs text-sidebar-foreground leading-tight">
            Admin Panel
          </p>
          <p className="text-[9px] text-sidebar-foreground/50 uppercase tracking-wide">
            Sankt Georg
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {adminNavItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-2 border-t border-sidebar-border">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={profile.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-sidebar-foreground truncate">
              {fullName}
            </p>
            <p className="text-[9px] text-sidebar-foreground/50 capitalize">
              {profile.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
