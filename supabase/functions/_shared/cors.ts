// Shared CORS headers + helpers for all Edge Functions.
// Tighten `Access-Control-Allow-Origin` to your SPA origin(s) in production.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** ActionResult-shaped success/error, matching the legacy server actions. */
export function ok<T>(data: T): Response {
  return json({ success: true, data }, 200);
}

export function fail(error: string, status = 400): Response {
  return json({ success: false, error }, status);
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
