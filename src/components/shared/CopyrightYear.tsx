import { cacheLife } from "next/cache";

/**
 * Renders the current year, cached at build time for the lifetime of the
 * deployment (cacheLife "max"). This avoids prerender-time errors from calling
 * new Date() in a server component without prior request-data access.
 */
export async function CopyrightYear() {
  "use cache";
  cacheLife("max");
  return <>{new Date().getFullYear()}</>;
}
