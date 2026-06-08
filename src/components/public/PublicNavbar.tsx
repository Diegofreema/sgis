'use client';

import { Button } from '@/components/ui/button';
import { publicNav } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandLogo } from '../shared/brand-logo';

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!mounted) {
      const toggle = () => setMounted(true);
      toggle();
    }
  }, [mounted]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    return () => setMobileOpen(false);
  }, [pathname]);

  const atHero = !scrolled;

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
              <p
                className={cn(
                  'font-serif font-semibold text-sm leading-tight transition-colors duration-500',
                  atHero ? 'text-white' : 'text-foreground',
                )}
              >
                Sankt Georg
              </p>
              <p
                className={cn(
                  'text-[10px] leading-tight tracking-wide uppercase transition-colors duration-500',
                  atHero ? 'text-white/70' : 'text-muted-foreground',
                )}
              >
                International School
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1">
            {publicNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-300',
                    pathname === item.href
                      ? atHero
                        ? 'text-white'
                        : 'text-primary'
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
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* CTA */}
            <Button
              asChild
              size="sm"
              variant={atHero ? 'outline' : 'default'}
              className={cn(
                'hidden sm:inline-flex font-medium transition-all duration-300',
                atHero
                  ? 'border-white/60 text-white bg-white/10 hover:bg-white/20 hover:border-white shadow-none backdrop-blur-sm'
                  : 'shadow-brand-sm',
              )}
            >
              <Link href="/login">Student Portal</Link>
            </Button>

            {/* Mobile menu */}
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
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
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
              <div className="pt-2 border-t border-border">
                <Button asChild className="w-full mt-2 font-medium" size="sm">
                  <Link href="/login">Student Portal</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
