import { listPayments } from "@/server/queries/payments.queries";
import { requireRole } from "@/lib/auth";
import { FadeIn } from "@/components/animations/FadeIn";
import { PaymentsAdminClient } from "./PaymentsAdminClient";

export default async function AdminPaymentsPage() {
  await requireRole(["admin"]);
  const allPayments = await listPayments();

  const submittedCount = allPayments.filter((p) => p.status === "submitted").length;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-serif text-h3 font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {allPayments.length} total · {submittedCount > 0 && (
              <span className="text-warning font-medium">
                {submittedCount} awaiting review
              </span>
            )}
            {submittedCount === 0 && "all up to date"}
          </p>
        </div>
      </FadeIn>

      <FadeIn>
        <PaymentsAdminClient payments={allPayments} />
      </FadeIn>
    </div>
  );
}
