import { Suspense } from 'react';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { getCurrentProfile } from '@/lib/auth';

async function PublicNavbarWithProfile() {
  const profile = await getCurrentProfile();
  return <PublicNavbar profile={profile} />;
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<PublicNavbar profile={null} />}>
        <PublicNavbarWithProfile />
      </Suspense>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
