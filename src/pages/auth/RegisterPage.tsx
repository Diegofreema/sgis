import { useEffect } from "react";

/** Legacy /register redirects to /entrance-exam. Preserve that URL redirect. */
export function RegisterPage() {
  useEffect(() => {
    window.location.href = "/entrance-exam";
  }, []);
  return null;
}
