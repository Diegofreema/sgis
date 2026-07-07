import { useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";

/** `next/navigation` compat shims mapped onto TanStack Router. */

export function usePathname(): string {
  return useLocation({ select: (l) => l.pathname });
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (to: string) => navigate({ to }),
    replace: (to: string) => navigate({ to, replace: true }),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function useSearchParams(): URLSearchParams {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v != null) params.set(k, String(v));
  }
  return params;
}

export { useParams };
