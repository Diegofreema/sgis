import { Suspense } from 'react';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { siteConfig } from '@/config/site';

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
        <PublicNavbar profile={null} />
      </Suspense>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
