import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok, serverError } from "../_shared/cors.ts";

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
    if (!actor || actor.role !== "super_admin") {
      return fail("Super admin access required.", 403);
    }

    const body = await req.json();
    const userId = String(body?.userId ?? "");
    if (!userId || userId === actor.id) return fail("Choose another admin to remove.");

    const { data: target, error: targetError } = await db
      .from("profiles")
      .select("id, email, role")
      .eq("id", userId)
      .maybeSingle();
    if (targetError) return serverError("admin-remove-user:target", targetError);
    if (!target || target.role !== "admin") return fail("Admin user not found.", 404);

    const { error: updateError } = await db
      .from("profiles")
      .update({ role: "disabled", updated_at: new Date().toISOString() })
      .eq("id", target.id)
      .eq("role", "admin");
    if (updateError) return serverError("admin-remove-user:update", updateError);

    await db.from("activity_logs").insert({
      actor_id: actor.id,
      actor_role: "super_admin",
      action: "user.admin_removed",
      entity_type: "profile",
      entity_id: target.id,
      metadata: { email: target.email },
    });

    return ok({ userId: target.id });
  } catch (error) {
    return serverError("admin-remove-user", error);
  }
});
