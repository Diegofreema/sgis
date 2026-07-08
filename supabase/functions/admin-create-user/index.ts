// POST /functions/v1/admin-create-user
// Admin-only: create another admin account. Needs the service role (auth admin
// API + profile insert bypassing RLS), so it can't live in the browser. The
// caller's JWT is forwarded by supabase-js functions.invoke; we verify it maps
// to an admin profile before doing anything.
// Body: { email, password, firstName, lastName, phone? } → { userId }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok } from "../_shared/cors.ts";

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
    const password = String(body?.password ?? "");
    const firstName = String(body?.firstName ?? "").trim();
    const lastName = String(body?.lastName ?? "").trim();
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("A valid email is required.");
    if (password.length < 8) return fail("Password must be at least 8 characters.");
    if (!firstName || !lastName) return fail("First and last name are required.");

    // Create the auth user (email pre-confirmed so they can sign in at once).
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "Could not create the account.";
      // Supabase returns a 422-ish message for an existing email.
      return fail(/already|exist|registered/i.test(msg) ? "That email is already registered." : msg);
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
      return fail(profileErr?.message ?? "Could not create the profile.");
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

    return ok({ userId: profile.id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error.", 500);
  }
});
