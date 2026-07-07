/** Renders the current year. Client-rendered in the Vite app. */
export function CopyrightYear() {
  return <>{new Date().getFullYear()}</>;
}
