import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Suspense } from 'react';
import { getCurrentProfile } from '@/lib/auth';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar profile={profile} />
      <main className="flex-1">{children}</main>
      <Suspense>
        <PublicFooter />
      </Suspense>
    </div>
  );
}
