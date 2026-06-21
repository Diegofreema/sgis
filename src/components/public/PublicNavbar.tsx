'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Moon, Sun, X, LayoutDashboard, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BrandLogo } from '../shared/brand-logo';
import { publicNav } from '@/config/navigation';
import { logout } from '@/server/actions/auth.actions';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types/auth';

type Props = {
  profile: UserProfile | null;
};

function getInitials(profile: UserProfile): string {
  const f = profile.firstName?.[0] ?? '';
  const l = profile.lastName?.[0] ?? '';
  return (f + l).toUpperCase() || profile.email[0].toUpperCase();
}

export function PublicNavbar({ profile }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { startTransition(() => setMounted(true)); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    startTransition(() => {
      setMobileOpen(false);
      setUserMenuOpen(false);
    });
  }, [pathname]);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const atHero = !scrolled;
  const dashboardHref = profile?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-brand-sm'
          : 'bg-linear-to-b from-black/55 to-transparent',
      )}
    >
      <nav className="container mx-auto container-padding">
        <div className="flex h-16 md:h-18 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-brand-sm">
              <BrandLogo />
            </div>
            <div className="hidden sm:block">
              <p className={cn(
                'font-serif font-semibold text-sm leading-tight transition-colors duration-500',
                atHero ? 'text-white' : 'text-foreground',
              )}>
                Sankt Georg
              </p>
              <p className={cn(
                'text-[10px] leading-tight tracking-wide uppercase transition-colors duration-500',
                atHero ? 'text-white/70' : 'text-muted-foreground',
              )}>
                International School
              </p>
            </div>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-1">
            {publicNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-300',
                    pathname === item.href
                      ? atHero ? 'text-white' : 'text-primary'
                      : atHero
                        ? 'text-white/80 hover:text-white hover:bg-white/15'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  {item.label}
                  {pathname === item.href && (
                    <motion.span
                      layoutId="nav-indicator"
                      className={cn(
                        'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors duration-500',
                        atHero ? 'bg-white' : 'bg-primary',
                      )}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-9 w-9 rounded-lg transition-colors duration-300',
                  atHero && 'text-white hover:text-white hover:bg-white/15',
                )}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}

            {/* Auth section — desktop */}
            {profile ? (
              /* Avatar + dropdown */
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-label="Open user menu"
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-300',
                    atHero ? 'hover:bg-white/15' : 'hover:bg-accent',
                  )}
                >
                  <Avatar size="sm" className="ring-2 ring-white/30">
                    <AvatarImage src={profile.avatarUrl ?? ''} alt={profile.firstName ?? 'User'} />
                    <AvatarFallback className={cn(
                      'text-xs font-semibold',
                      atHero ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
                    )}>
                      {getInitials(profile)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn(
                    'hidden lg:block text-sm font-medium transition-colors duration-300',
                    atHero ? 'text-white/90' : 'text-foreground',
                  )}>
                    {profile.firstName ?? profile.email.split('@')[0]}
                  </span>
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-background shadow-lg overflow-hidden z-60"
                    >
                      {/* User info header */}
                      <div className="px-3.5 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      </div>

                      {/* Menu items */}
                      <div className="py-1">
                        <Link
                          href={dashboardHref}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          Profile
                        </Link>
                      </div>

                      <div className="border-t border-border py-1">
                        <form action={logout}>
                          <button
                            type="submit"
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Sign In + Sign Up */
              <div className="hidden sm:flex items-center gap-1.5">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'font-medium transition-all duration-300',
                    atHero
                      ? 'text-white/85 hover:text-white hover:bg-white/15'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant={atHero ? 'outline' : 'default'}
                  className={cn(
                    'font-medium transition-all duration-300',
                    atHero
                      ? 'border-white/60 text-white bg-white/10 hover:bg-white/20 hover:border-white shadow-none backdrop-blur-sm'
                      : 'shadow-brand-sm',
                  )}
                >
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'md:hidden h-9 w-9 rounded-lg transition-colors duration-300',
                atHero && 'text-white hover:text-white hover:bg-white/15',
              )}
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border bg-background/98 backdrop-blur-md overflow-hidden"
          >
            <div className="container mx-auto container-padding py-4 space-y-1">
              {/* Nav links */}
              {publicNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  {item.label}
                </Link>
              ))}

              {/* Auth section */}
              <div className="pt-3 border-t border-border space-y-2">
                {profile ? (
                  <>
                    {/* User info */}
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Avatar size="sm">
                        <AvatarImage src={profile.avatarUrl ?? ''} />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {getInitials(profile)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="w-full justify-start gap-2" size="sm">
                      <Link href={dashboardHref}>
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                    </Button>
                    <form action={logout}>
                      <Button
                        type="submit"
                        variant="ghost"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        size="sm"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full font-medium" size="sm">
                      <Link href="/login">Sign In</Link>
                    </Button>
                    <Button asChild className="w-full font-medium" size="sm">
                      <Link href="/register">Sign Up</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
