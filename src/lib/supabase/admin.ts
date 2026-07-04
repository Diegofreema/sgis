import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

function getJwtPayload(key: string): { role?: unknown; ref?: unknown } | null {
  const [, payload] = key.split(".");
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin provisioning flows."
    );
  }

  const payload = getJwtPayload(env.SUPABASE_SERVICE_ROLE_KEY);
  if (payload && payload.role !== "service_role") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be the project's service_role key, not the anon key."
    );
  }

  const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  if (payload?.ref && payload.ref !== projectRef) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must belong to the configured Supabase project."
    );
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
