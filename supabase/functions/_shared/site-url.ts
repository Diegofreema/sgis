export function getSiteUrl(req: Request): string {
  const value = req.headers.get("Origin") ?? Deno.env.get("SITE_URL");
  if (!value) throw new Error("Missing app URL.");
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new Error("Invalid app URL.");
  }
  return url.origin;
}
