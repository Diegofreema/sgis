import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

function readFlag(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function requireFlag(name) {
  const value = readFlag(name);
  if (!value) {
    throw new Error(`Missing required flag --${name}`);
  }
  return value;
}

function formatAdminAuthError(message) {
  const normalized = message?.toLowerCase?.() ?? "";

  if (
    normalized.includes("user not allowed") ||
    normalized.includes("not_admin") ||
    normalized.includes("service_role") ||
    normalized.includes("supabase_admin")
  ) {
    return "SUPABASE_SERVICE_ROLE_KEY is not authorized for Supabase admin auth operations. Replace it with the project's real service-role key.";
  }

  return message ?? "Failed to create Supabase auth user.";
}

async function main() {
  const email = requireFlag("email");
  const firstName = requireFlag("first-name");
  const lastName = requireFlag("last-name");
  const password = requireFlag("password");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!url || !serviceRoleKey || !databaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL must be set."
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });

  if (error || !data.user) {
    throw new Error(formatAdminAuthError(error?.message));
  }

  const sql = postgres(databaseUrl, { prepare: false });

  try {
    await sql`
      insert into profiles (
        auth_user_id,
        role,
        first_name,
        last_name,
        email,
        email_verified_at
      )
      values (
        ${data.user.id}::uuid,
        'admin',
        ${firstName},
        ${lastName},
        ${email},
        now()
      )
      on conflict (auth_user_id) do update
      set
        role = 'admin',
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = excluded.email,
        email_verified_at = coalesce(profiles.email_verified_at, now()),
        updated_at = now()
    `;
  } catch (dbError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw dbError;
  } finally {
    await sql.end();
  }

  console.log(`Admin account ready for ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
