import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { generateReference } from "@/lib/utils";

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type MailDeliveryResult =
  | { mode: "resend" }
  | { mode: "outbox"; filePath: string };

export function assertMailConfigured() {
  if (env.RESEND_API_KEY || env.EMAIL_OUTBOX_DIR || process.env.NODE_ENV !== "production") {
    return;
  }
  throw new Error("RESEND_API_KEY is not set. Email delivery will fail in production.");
}

async function writeToOutbox(input: MailInput): Promise<MailDeliveryResult> {
  const outboxDir =
    env.EMAIL_OUTBOX_DIR ?? path.join(process.cwd(), ".email-outbox");
  const filePath = path.join(
    outboxDir,
    `${Date.now()}-${generateReference("email").toLowerCase()}.html`
  );

  await mkdir(outboxDir, { recursive: true });
  await writeFile(
    filePath,
    [
      `TO: ${input.to}`,
      `SUBJECT: ${input.subject}`,
      "",
      input.text,
      "",
      "---- HTML ----",
      input.html,
    ].join("\n"),
    "utf8"
  );

  return { mode: "outbox", filePath };
}

export async function sendMail(input: MailInput): Promise<MailDeliveryResult> {
  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production" || env.EMAIL_OUTBOX_DIR) {
      return writeToOutbox(input);
    }
    throw new Error("RESEND_API_KEY is not set.");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);

  const fromName = env.SMTP_FROM_NAME ?? siteConfig.name;
  const fromEmail = env.SMTP_FROM_EMAIL ?? "noreply@sgis.ng";

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  if (error) {
    throw new Error(`Resend delivery failed: ${error.message}`);
  }

  return { mode: "resend" };
}

export async function sendStudentCredentialsEmail(input: {
  studentEmail: string;
  studentName: string;
  parentName: string;
  password: string;
}): Promise<MailDeliveryResult> {
  const loginUrl = `${siteConfig.url}/login`;

  return sendMail({
    to: input.studentEmail,
    subject: "Your SGIS student account is ready",
    text: [
      `Hello ${input.studentName},`,
      "",
      `${input.parentName} has created your SGIS student portal account.`,
      `Login email: ${input.studentEmail}`,
      `Temporary password: ${input.password}`,
      "",
      `Sign in at ${loginUrl} and change your password immediately after your first login.`,
    ].join("\n"),
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #1f1720; line-height: 1.6; max-width: 520px; margin: 0 auto;">
        <div style="background: #7a2936; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; font-family: Georgia, serif; font-size: 22px; margin: 0;">
            Sankt Georg International School
          </h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e8dede; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="font-family: Georgia, serif; color: #7a2936; font-size: 20px; margin-top: 0;">
            Your student account is ready
          </h2>
          <p>Hello <strong>${input.studentName}</strong>,</p>
          <p>${input.parentName} has created your SGIS student portal account.</p>
          <div style="background: #faf6f6; border: 1px solid #e8dede; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Login email:</strong> ${input.studentEmail}</p>
            <p style="margin: 0;"><strong>Temporary password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e8dede;">${input.password}</code></p>
          </div>
          <p>
            <a href="${loginUrl}" style="display: inline-block; background: #7a2936; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
              Sign In Now
            </a>
          </p>
          <p style="color: #888; font-size: 13px;">
            You must change your password immediately after your first login before you can access the portal.
          </p>
        </div>
      </div>
    `,
  });
}
