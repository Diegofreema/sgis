// POST /functions/v1/admin-create-user
// Admin-only: create another admin account. Needs the service role (auth admin
// API + profile insert bypassing RLS), so it can't live in the browser. The
// caller's JWT is forwarded by supabase-js functions.invoke; we verify it maps
// to an admin profile before doing anything.
// Body: { email, firstName, lastName, phone? } → { userId }
// No password is set by the caller: the account gets a throwaway random one and
// the new admin receives a recovery link to choose their own.
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok, serverError } from "../_shared/cors.ts";
import { adminWelcomeEmailHtml, sendEmail } from "../_shared/email.ts";

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
    const { data: actor } = await db
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (!actor || actor.role !== "admin") return fail("Admin access required.", 403);

    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const firstName = String(body?.firstName ?? "").trim();
    const lastName = String(body?.lastName ?? "").trim();
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("A valid email is required.");
    if (!firstName || !lastName) return fail("First and last name are required.");

    // Create the auth user (email pre-confirmed). The password is random and
    // never disclosed — the welcome email carries a link to set a real one.
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      // Supabase returns a 422-ish message for an existing email.
      if (/already|exist|registered/i.test(createErr?.message ?? "")) {
        return fail("That email is already registered.");
      }
      return serverError("admin-create-user:createUser", createErr);
    }
    const newAuthId = created.user.id;

    // Create the admin profile. On failure, roll back the orphan auth user.
    const nowIso = new Date().toISOString();
    const { data: profile, error: profileErr } = await db
      .from("profiles")
      .insert({
        auth_user_id: newAuthId,
        role: "admin",
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        email_verified_at: nowIso,
        requires_password_change: true,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id")
      .single();
    if (profileErr || !profile) {
      await db.auth.admin.deleteUser(newAuthId).catch(() => {});
      return serverError("admin-create-user:profileInsert", profileErr);
    }

    // Explicit audit log — this runs as the service role (auth.uid() is null),
    // so the table trigger skips it; record the acting admin here.
    await db.from("activity_logs").insert({
      actor_id: actor.id,
      actor_role: "admin",
      action: "user.created",
      entity_type: "profile",
      entity_id: profile.id,
      metadata: { email, role: "admin" },
    });

    // Email is best-effort: the account already exists. The link drops the new
    // admin on /reset-password, which already handles a recovery session.
    try {
      const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
      const { data: link, error: linkErr } = await db.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${siteUrl}/reset-password` },
      });
      if (linkErr || !link?.properties?.action_link) throw linkErr ?? new Error("No action link.");
      await sendEmail({
        to: email,
        subject: "Set up your admin account",
        html: adminWelcomeEmailHtml({
          firstName,
          email,
          setupUrl: link.properties.action_link,
        }),
      });
    } catch (mailError) {
      console.error("[admin-create-user] invite email failed:", mailError);
      return ok({ userId: profile.id, emailed: false });
    }

    return ok({ userId: profile.id, emailed: true });
  } catch (error) {
    return serverError("admin-create-user", error);
  }
});
