// Minimal Resend sender for Edge Functions (replaces legacy src/lib/email.ts).
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("SMTP_FROM_EMAIL") ?? "no-reply@example.com";
  const fromName = Deno.env.get("SMTP_FROM_NAME") ?? "Sankt Georg International School";
  if (!apiKey) throw new Error("Email is not configured.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${from}>`,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Could not send email (${res.status}): ${detail.slice(0, 200)}`);
  }
}

export function statusEmailHtml(input: {
  applicantName: string;
  applicationCode: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}): string {
  const statusLabel =
    input.status === "approved" ? "approved" : input.status === "rejected" ? "not approved" : "pending";
  const extra =
    input.status === "approved"
      ? "You may now print your examination ID card from the application page."
      : input.status === "rejected" && input.rejectionReason
        ? `Reason: ${input.rejectionReason}`
        : "Your application is still being reviewed.";
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
      <h2>Application status update</h2>
      <p>Dear <strong>${input.applicantName}</strong>,</p>
      <p>Your application <strong>${input.applicationCode}</strong> is <strong>${statusLabel}</strong>.</p>
      <p>${extra}</p>
    </div>`;
}

export function otpEmailHtml(input: {
  applicantName: string;
  sessionTitle: string;
  examTitle: string;
  code: string;
  expiresInMinutes: number;
}): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
      <h2>Your exam verification code</h2>
      <p>Hello ${input.applicantName},</p>
      <p>Use this code to access <strong>${input.examTitle}</strong> (${input.sessionTitle}):</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px">${input.code}</p>
      <p>This code expires in ${input.expiresInMinutes} minutes.</p>
    </div>`;
}

export function adminWelcomeEmailHtml(input: {
  firstName: string;
  email: string;
  setupUrl: string;
}): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
      <h2>Your admin account is ready</h2>
      <p>Hello ${input.firstName},</p>
      <p>An administrator account has been created for <strong>${input.email}</strong>.</p>
      <p>Choose your password to finish setting it up:</p>
      <p><a href="${input.setupUrl}"
            style="display:inline-block;padding:12px 20px;border-radius:8px;background:#111;color:#fff;text-decoration:none">
        Set your password
      </a></p>
      <p style="font-size:13px;color:#666">This link can only be used once and expires within 24 hours.
      If it has expired, use "Forgot password" on the sign-in page.</p>
    </div>`;
}
