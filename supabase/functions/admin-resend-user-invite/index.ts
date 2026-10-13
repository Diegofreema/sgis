import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok, serverError } from "../_shared/cors.ts";
import { adminWelcomeEmailHtml, sendEmail } from "../_shared/email.ts";
import { getSiteUrl } from "../_shared/site-url.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return fail("Not authorized.", 401);

    const db = serviceClient();
    const { data: userData } = await db.auth.getUser(token);
    const authUser = userData?.user;
    if (!authUser) return fail("Not authorized.", 401);

    const { data: actor } = await db
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (!actor || (actor.role !== "admin" && actor.role !== "super_admin")) {
      return fail("Admin access required.", 403);
    }

    const body = await req.json();
    const userId = String(body?.userId ?? "");
    if (!userId) return fail("Admin user is required.");

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, email, first_name, role, requires_password_change")
      .eq("id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (profileError) return serverError("admin-resend-user-invite:profile", profileError);
    if (!profile) return fail("Admin user not found.", 404);
    if (!profile.requires_password_change) return fail("Admin setup is already complete.");

    let emailed = true;
    try {
      const { data: link, error: linkError } = await db.auth.admin.generateLink({
        type: "recovery",
        email: profile.email,
        options: { redirectTo: `${getSiteUrl(req)}/reset-password` },
      });
      if (linkError || !link?.properties?.action_link) {
        throw linkError ?? new Error("No action link.");
      }
      await sendEmail({
        to: profile.email,
        subject: "Set up your admin account",
        html: adminWelcomeEmailHtml({
          firstName: profile.first_name ?? "",
          email: profile.email,
          setupUrl: link.properties.action_link,
        }),
      });
    } catch (mailError) {
      emailed = false;
      console.error("[admin-resend-user-invite] invite email failed:", mailError);
    }

    await db.from("activity_logs").insert({
      actor_id: actor.id,
      actor_role: "admin",
      action: "user.invite_resent",
      entity_type: "profile",
      entity_id: profile.id,
      metadata: { email: profile.email, emailed },
    });

    return ok({ emailed });
  } catch (error) {
    return serverError("admin-resend-user-invite", error);
  }
});
