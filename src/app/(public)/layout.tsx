import { Suspense } from 'react';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { siteConfig } from '@/config/site';
import { getCurrentProfile } from '@/lib/auth';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense
        fallback={
          <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border">
            <div className="container mx-auto container-padding flex h-16 items-center font-serif font-semibold">
              {siteConfig.shortName}
            </div>
          </header>
        }
      >
        <PublicNavbarSlot />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Suspense fallback={<FooterFallback />}>
        <PublicFooter />
      </Suspense>
    </div>
  );
}

function FooterFallback() {
  return <footer className="border-t border-border bg-muted/30 py-16" aria-hidden="true" />;
}

async function PublicNavbarSlot() {
  const profile = await getCurrentProfile();
  return <PublicNavbar profile={profile} />;
}
