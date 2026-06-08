#!/usr/bin/env node

import crypto from "node:crypto";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

function getArg(name, fallback) {
  const args = process.argv.slice(2);
  const direct = args.find((arg) => arg.startsWith(`${name}=`));

  if (direct) {
    return direct.slice(name.length + 1);
  }

  const index = args.indexOf(name);
  if (index !== -1) {
    return args[index + 1] ?? fallback;
  }

  return fallback;
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set before running this script.`);
  }

  return value;
}

function getSetCookie(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function toCookieHeader(setCookies) {
  return setCookies.map((cookie) => cookie.split(";", 1)[0]).join("; ");
}

function assertStatus(response, expected, label) {
  if (!expected.includes(response.status)) {
    throw new Error(`${label} returned ${response.status}.`);
  }
}

const baseUrl = getArg("--base-url", process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000");
const emailDomain = getArg("--email-domain", "mailinator.com");
const projectUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const databaseUrl = requireEnv("DATABASE_URL");

const publicClient = createClient(projectUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sql = postgres(databaseUrl, {
  prepare: false,
});

const runId = crypto.randomBytes(6).toString("hex");
const parentEmail = `auth.parent.${runId}@${emailDomain}`;
const parentPassword = "ParentPass123";
let authUserId = null;
let lastTokenCreatedAt = null;

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertParentProfile(userId) {
  await sql`
    insert into profiles (
      auth_user_id,
      role,
      first_name,
      last_name,
      email
    ) values (
      ${userId},
      'parent',
      'Auth',
      'Smoke',
      ${parentEmail}
    )
    on conflict (auth_user_id) do update
    set
      role = 'parent',
      first_name = 'Auth',
      last_name = 'Smoke',
      email = ${parentEmail},
      updated_at = now()
  `;
}

async function fetchRedirect(url, label, cookieHeader) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  assertStatus(response, [302, 303, 307], label);

  const location = response.headers.get("location");
  if (!location) {
    throw new Error(`${label} did not include a redirect location.`);
  }

  return {
    response,
    location: new URL(location, baseUrl).toString(),
  };
}

async function getUserIdByEmail(email) {
  const [user] = await sql`
    select id
    from auth.users
    where email = ${email}
    limit 1
  `;

  if (!user?.id) {
    throw new Error(`No auth.users row was created for ${email}.`);
  }

  return user.id;
}

async function getLatestTokenHash({ userId, type, after }) {
  const [token] = await sql`
    select token_hash, created_at
    from auth.one_time_tokens
    where user_id = ${userId}
      and created_at >= ${after}
    order by created_at desc
    limit 1
  `;

  if (!token?.token_hash) {
    throw new Error(`No ${type} token_hash was issued for ${parentEmail}.`);
  }

  lastTokenCreatedAt = token.created_at;
  return token.token_hash;
}

async function verifySignupCallback() {
  const issuedAt = new Date();
  const { data, error } = await publicClient.auth.signUp({
    email: parentEmail,
    password: parentPassword,
    options: { emailRedirectTo: `${baseUrl}/auth/confirm?next=%2Fdashboard` },
  });

  if (error) {
    throw new Error(error.message);
  }

  await wait(750);

  authUserId = data.user?.id ?? (await getUserIdByEmail(parentEmail));
  await upsertParentProfile(authUserId);
  const tokenHash = await getLatestTokenHash({
    userId: authUserId,
    type: "signup",
    after: issuedAt,
  });

  const appRedirect = await fetchRedirect(
    `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=signup&next=%2Fdashboard`,
    "Supabase signup verification"
  );

  if (!appRedirect.location.endsWith("/dashboard")) {
    throw new Error(`Expected /dashboard redirect, received ${appRedirect.location}`);
  }

  const cookies = getSetCookie(appRedirect.response);
  if (cookies.length === 0) {
    throw new Error("App auth confirm callback did not set any session cookies.");
  }

  const cookieHeader = toCookieHeader(cookies);
  const dashboardResponse = await fetch(appRedirect.location, {
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });

  assertStatus(dashboardResponse, [200], "Dashboard landing page");

  const [profile] = await sql`
    select email_verified_at
    from profiles
    where auth_user_id = ${authUserId}
    limit 1
  `;

  if (!profile?.email_verified_at) {
    throw new Error("Parent profile was not marked as email verified.");
  }

  return cookieHeader;
}

async function verifyRecoveryCallback() {
  const issuedAt = new Date();
  const { error } = await publicClient.auth.resetPasswordForEmail(parentEmail, {
    redirectTo: `${baseUrl}/auth/confirm?next=%2Freset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }

  await wait(750);
  const tokenHash = await getLatestTokenHash({
    userId: authUserId,
    type: "recovery",
    after: issuedAt > lastTokenCreatedAt ? issuedAt : lastTokenCreatedAt ?? issuedAt,
  });

  const appRedirect = await fetchRedirect(
    `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=%2Freset-password`,
    "Recovery auth confirm callback"
  );

  if (!appRedirect.location.endsWith("/reset-password")) {
    throw new Error(`Expected /reset-password redirect, received ${appRedirect.location}`);
  }

  const cookieHeader = toCookieHeader(getSetCookie(appRedirect.response));
  if (!cookieHeader) {
    throw new Error("Recovery callback did not set any session cookies.");
  }

  const resetResponse = await fetch(appRedirect.location, {
    headers: { cookie: cookieHeader },
  });

  assertStatus(resetResponse, [200], "Reset password page");

  const html = await resetResponse.text();
  if (!html.includes("Save new password")) {
    throw new Error("Reset password form did not render for the recovery session.");
  }
}

async function cleanup() {
  if (authUserId) {
    await sql`delete from profiles where auth_user_id = ${authUserId}`;
    await sql`delete from auth.users where id = ${authUserId}`;
  }

  await sql.end({ timeout: 5 });
}

try {
  await verifySignupCallback();
  await verifyRecoveryCallback();

  console.log(`Auth callback smoke test passed for ${parentEmail}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await cleanup();
}
