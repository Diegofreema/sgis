/**
 * Profile page — Server Component wrapper.
 *
 * Fetches the authenticated profile server-side via requireAuth() (one DB
 * call, deduplicated with React cache()), then hands the data to the Client
 * Component <ProfileFormClient> as a prop.
 *
 * This pattern:
 * - Keeps all DB/auth logic on the server (no client-side DB imports).
 * - Eliminates the "profile flash" (loading spinner while Zustand hydrates).
 * - Still lets the form be interactive (useForm, toast, etc.) via the client boundary.
 */
import { requireAuth } from "@/lib/auth";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { ProfileFormClient } from "./ProfileFormClient";

type Props = {
  searchParams: Promise<{ student?: string }>;
};

export default async function ProfilePage({ searchParams }: Props) {
  await requireAuth();
  const { student } = await searchParams;
  const context = await resolveManagedProfileContext(student);

  return (
    <ProfileFormClient
      actor={context.actor}
      profile={context.target}
      isManagingStudent={context.isManagingStudent}
    />
  );
}
