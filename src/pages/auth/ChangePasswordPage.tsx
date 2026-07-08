import { PasswordUpdateForm } from "@/components/forms/PasswordUpdateForm";

/**
 * First-login password gate. Admin-provisioned accounts land here (via login()
 * and the admin guard) until they set their own password; PasswordUpdateForm →
 * updatePassword() clears the requires_password_change flag and sends them on.
 */
export function ChangePasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold text-foreground">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Your account was created by an administrator. Choose your own password to continue.
        </p>
      </div>

      <PasswordUpdateForm
        heading="Choose a password"
        description="Use a strong password you haven't used elsewhere."
        submitLabel="Save and continue"
        successMessage="Password set. Redirecting to your console…"
      />
    </div>
  );
}
