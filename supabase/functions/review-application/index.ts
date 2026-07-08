// POST /functions/v1/review-application
// Admin-only application review (port of legacy reviewApplication): updates
// status + rejection reason + reviewer stamp, optional internal notes on the
// applicant profile, then emails the applicant. Service role + explicit admin
// check (the caller's JWT is forwarded by supabase-js functions.invoke).
// Body: { applicationId, status, rejectionReason?, notes? } → { success }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok, serverError } from "../_shared/cors.ts";
import { sendEmail, statusEmailHtml } from "../_shared/email.ts";

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return fail("Not authorized.", 401);

    const db = serviceClient();

    // Verify the caller is an authenticated admin.
    const { data: userData } = await db.auth.getUser(token);
    const authUser = userData?.user;
    if (!authUser) return fail("Not authorized.", 401);
    const { data: reviewer } = await db
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (!reviewer || reviewer.role !== "admin") return fail("Admin access required.", 403);

    const body = await req.json();
    const applicationId = String(body?.applicationId ?? "");
    const status = body?.status as Status;
    const rejectionReason = typeof body?.rejectionReason === "string" ? body.rejectionReason.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    if (!applicationId || !STATUSES.includes(status)) return fail("Invalid request.");
    if (status === "rejected" && !rejectionReason) return fail("Rejection reason is required.");

    const { data: application } = await db
      .from("applications")
      .select("id, first_name, last_name, email, application_code, user_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (!application) return fail("Application not found.");

    const { error: updateErr } = await db
      .from("applications")
      .update({
        status,
        rejection_reason: status === "rejected" ? rejectionReason : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);
    if (updateErr) return serverError("review-application:update", updateErr);

    // Explicit audit log — service role means auth.uid() is null, so the table
    // trigger skips this; record the reviewing admin here.
    await db.from("activity_logs").insert({
      actor_id: reviewer.id,
      actor_role: "admin",
      action: `application.${status}`,
      entity_type: "application",
      entity_id: applicationId,
      metadata: status === "rejected" ? { rejectionReason } : null,
    });

    if (notes && application.user_id) {
      await db
        .from("profiles")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", application.user_id);
    }

    // Email is best-effort: the review already persisted.
    try {
      await sendEmail({
        to: application.email,
        subject: "Application status update",
        html: statusEmailHtml({
          applicantName: `${application.first_name} ${application.last_name}`,
          applicationCode: application.application_code,
          status,
          rejectionReason: rejectionReason || undefined,
        }),
      });
    } catch (mailError) {
      console.error("[review-application] email failed:", mailError);
      return ok({ emailed: false });
    }

    return ok({ emailed: true });
  } catch (error) {
    return serverError("review-application", error);
  }
});
