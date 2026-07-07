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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function schoolAddress() {
  const { street, city, country } = siteConfig.address;
  return `${street}, ${city}, ${country}`;
}

function schoolEmailShell(input: {
  title: string;
  preview: string;
  body: string;
}) {
  const logoUrl = `${siteConfig.url}/logo.jpeg`;
  return `
    <div style="font-family: Arial, sans-serif; color: #24181b; line-height: 1.55; max-width: 560px; margin: 0 auto; background: #ffffff;">
      <div style="border: 1px solid #eadfe2; border-radius: 10px; overflow: hidden;">
        <div style="padding: 22px 26px; background: #7a2936; color: #ffffff;">
          <img src="${logoUrl}" width="52" height="52" alt="${escapeHtml(siteConfig.name)} logo" style="display: block; border-radius: 8px; margin-bottom: 12px; object-fit: cover;" />
          <h1 style="font-family: Georgia, serif; font-size: 21px; margin: 0;">${escapeHtml(siteConfig.name)}</h1>
          <p style="font-size: 12px; margin: 5px 0 0; color: #f4dfe3;">${escapeHtml(schoolAddress())}</p>
        </div>
        <div style="padding: 26px;">
          <p style="display: none; visibility: hidden; opacity: 0;">${escapeHtml(input.preview)}</p>
          <h2 style="font-family: Georgia, serif; color: #7a2936; font-size: 19px; margin: 0 0 14px;">${escapeHtml(input.title)}</h2>
          ${input.body}
          <p style="font-size: 12px; color: #7b7174; margin-top: 24px;">
            Please check your email regularly for updates from the admissions office.
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function sendApplicationReceivedEmail(input: {
  to: string;
  applicantName: string;
  applicationCode: string;
  sessionTitle: string;
}): Promise<MailDeliveryResult> {
  const statusUrl = `${siteConfig.url}/entrance-exam?applicationId=${encodeURIComponent(input.applicationCode)}`;
  const text = [
    `Dear ${input.applicantName},`,
    "",
    `Welcome to ${siteConfig.name}.`,
    `Your application for ${input.sessionTitle} has been received.`,
    `Application ID: ${input.applicationCode}`,
    "",
    "Keep this ID safe. You can use it to check your application status.",
    `Status page: ${statusUrl}`,
    "",
    `${siteConfig.name}`,
    schoolAddress(),
  ].join("\n");

  return sendMail({
    to: input.to,
    subject: `Welcome to ${siteConfig.shortName} admissions`,
    text,
    html: schoolEmailShell({
      title: "Welcome to SGIS admissions",
      preview: `Your application ID is ${input.applicationCode}.`,
      body: `
        <p>Dear <strong>${escapeHtml(input.applicantName)}</strong>,</p>
        <p>Welcome to <strong>${escapeHtml(siteConfig.name)}</strong>.</p>
        <p>Your application for <strong>${escapeHtml(input.sessionTitle)}</strong> has been received.</p>
        <div style="background: #fbf7f8; border: 1px solid #eadfe2; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
          <p style="margin: 0 0 6px; font-size: 12px; color: #7b7174;">Application ID</p>
          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${escapeHtml(input.applicationCode)}</p>
        </div>
        <p>Keep this ID safe. You can use it to check your application status.</p>
        <p style="margin-top: 20px;">
          <a href="${statusUrl}" style="display: inline-block; background: #7a2936; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 6px; font-weight: 600;">
            Track application status
          </a>
        </p>
      `,
    }),
  });
}

export async function sendPublicExamOtpEmail(input: {
  to: string;
  applicantName: string;
  sessionTitle: string;
  examTitle: string;
  code: string;
  expiresInMinutes: number;
}): Promise<MailDeliveryResult> {
  const text = [
    `Dear ${input.applicantName},`,
    "",
    `Your verification code for ${input.examTitle} (${input.sessionTitle}) is ${input.code}.`,
    `It expires in ${input.expiresInMinutes} minutes.`,
    "",
    "If you did not request this code, you can ignore this email.",
    "",
    `${siteConfig.name}`,
    schoolAddress(),
  ].join("\n");

  return sendMail({
    to: input.to,
    subject: `${siteConfig.shortName} exam verification code`,
    text,
    html: schoolEmailShell({
      title: "Exam verification code",
      preview: `Your code is ${input.code}.`,
      body: `
        <p>Dear <strong>${escapeHtml(input.applicantName)}</strong>,</p>
        <p>
          Use this code to access <strong>${escapeHtml(input.examTitle)}</strong> for
          <strong> ${escapeHtml(input.sessionTitle)}</strong>.
        </p>
        <div style="background: #fbf7f8; border: 1px solid #eadfe2; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
          <p style="margin: 0 0 6px; font-size: 12px; color: #7b7174;">Verification code</p>
          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; letter-spacing: 6px;">${escapeHtml(input.code)}</p>
        </div>
        <p>This code expires in ${input.expiresInMinutes} minutes.</p>
        <p style="color: #7b7174; font-size: 13px;">If you did not request this code, you can ignore this email.</p>
      `,
    }),
  });
}

export async function sendApplicationStatusEmail(input: {
  to: string;
  applicantName: string;
  applicationCode: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}): Promise<MailDeliveryResult> {
  const statusLabel =
    input.status === "approved"
      ? "approved"
      : input.status === "rejected"
        ? "not approved"
        : "pending";
  const extra =
    input.status === "approved"
      ? "You may now print your examination ID card from the application page."
      : input.status === "rejected" && input.rejectionReason
        ? `Reason: ${input.rejectionReason}`
        : "Your application is still being reviewed.";

  return sendMail({
    to: input.to,
    subject: "Application status update",
    text: [
      `Dear ${input.applicantName},`,
      "",
      `Your application (${input.applicationCode}) is ${statusLabel}.`,
      extra,
      "",
      `${siteConfig.name}`,
      schoolAddress(),
    ].join("\n"),
    html: schoolEmailShell({
      title: "Application status update",
      preview: `Your application ${input.applicationCode} is ${statusLabel}.`,
      body: `
        <p>Dear <strong>${escapeHtml(input.applicantName)}</strong>,</p>
        <p>Your application <strong>${escapeHtml(input.applicationCode)}</strong> is <strong>${escapeHtml(statusLabel)}</strong>.</p>
        <p>${escapeHtml(extra)}</p>
      `,
    }),
  });
}

export async function sendExamResultEmail(input: {
  to: string;
  applicantName: string;
  applicationCode: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  passingScore: number;
}): Promise<MailDeliveryResult> {
  const passed = input.score >= input.passingScore;

  return sendMail({
    to: input.to,
    subject: "Entrance examination result",
    text: [
      `Dear ${input.applicantName},`,
      "",
      `Your score for ${input.examTitle} is ${input.score}/${input.totalMarks}.`,
      `Application ID: ${input.applicationCode}`,
      `Status: ${passed ? "Passed" : "Not passed"}`,
      "",
      `${siteConfig.name}`,
      schoolAddress(),
    ].join("\n"),
    html: schoolEmailShell({
      title: "Entrance examination result",
      preview: `Your score is ${input.score}/${input.totalMarks}.`,
      body: `
        <p>Dear <strong>${escapeHtml(input.applicantName)}</strong>,</p>
        <p>Your score for <strong>${escapeHtml(input.examTitle)}</strong> is:</p>
        <div style="background: #fbf7f8; border: 1px solid #eadfe2; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #7a2936;">${input.score}/${input.totalMarks}</p>
          <p style="margin: 6px 0 0; font-size: 13px; color: #7b7174;">Application ID: ${escapeHtml(input.applicationCode)}</p>
        </div>
        <p>The admissions office will contact you if any further action is required.</p>
      `,
    }),
  });
}
