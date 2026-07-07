import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Root layout — equivalent to legacy app/layout.tsx.
 * Wraps every route in the theme provider and mounts the global toaster.
 */
export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <Outlet />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
