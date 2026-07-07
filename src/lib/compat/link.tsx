import { Link as RouterLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Drop-in replacement for `next/link` used during the Vite migration.
 * Maps Next's `href` API onto TanStack Router's `to`, so migrated
 * components keep their original `<Link href="...">` usage verbatim.
 */
type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  replace?: boolean;
  children?: ReactNode;
  // Accepted-and-ignored Next props so copied call sites still typecheck.
  prefetch?: boolean;
  scroll?: boolean;
};

// Cast away TanStack's typed-route generics — migration links use plain paths.
const AnyLink = RouterLink as unknown as React.ComponentType<
  Record<string, unknown>
>;

function parseHref(href: string): {
  to: string;
  search?: Record<string, string>;
  hash?: string;
} {
  const [pathAndQuery, hash] = href.split("#");
  const [to, query] = pathAndQuery.split("?");
  if (!query) return { to, hash };
  const search: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(query)) search[k] = v;
  return { to, search, hash };
}

export default function Link({
  href,
  replace,
  prefetch: _prefetch,
  scroll: _scroll,
  children,
  ...rest
}: LinkProps) {
  const { to, search, hash } = parseHref(href);
  return (
    <AnyLink to={to} search={search} hash={hash} replace={replace} {...rest}>
      {children}
    </AnyLink>
  );
}
