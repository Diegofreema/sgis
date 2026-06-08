import { requireAuth } from "@/lib/auth";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { getApplicationByUser } from "@/server/queries/applications.queries";
import { getActiveApplicationPeriod } from "@/server/queries/applications.queries";
import { ApplicationFormClient } from "./ApplicationFormClient";

type Props = {
  searchParams: Promise<{ student?: string }>;
};

export default async function ApplicationPage({ searchParams }: Props) {
  await requireAuth();
  const { student } = await searchParams;
  const context = await resolveManagedProfileContext(student);
  const [application, period] = await Promise.all([
    getApplicationByUser(context.target.id),
    getActiveApplicationPeriod(),
  ]);

  return (
    <ApplicationFormClient
      profile={context.target}
      application={application}
      period={period}
      isManagingStudent={context.isManagingStudent}
    />
  );
}
