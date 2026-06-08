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
  | { mode: "smtp" }
  | { mode: "outbox"; filePath: string };

function getSmtpConfig() {
  if (
    !env.SMTP_HOST ||
    !env.SMTP_PORT ||
    !env.SMTP_USER ||
    !env.SMTP_PASS ||
    !env.SMTP_FROM_EMAIL
  ) {
    throw new Error(
      "SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL."
    );
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: {
      address: env.SMTP_FROM_EMAIL,
      name: env.SMTP_FROM_NAME ?? siteConfig.name,
    },
  };
}

export function assertMailConfigured() {
  if (env.EMAIL_OUTBOX_DIR || process.env.NODE_ENV !== "production") {
    return;
  }

  getSmtpConfig();
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
  if (
    !env.SMTP_HOST ||
    !env.SMTP_PORT ||
    !env.SMTP_USER ||
    !env.SMTP_PASS ||
    !env.SMTP_FROM_EMAIL
  ) {
    if (process.env.NODE_ENV !== "production" || env.EMAIL_OUTBOX_DIR) {
      return writeToOutbox(input);
    }

    throw new Error(
      "SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL."
    );
  }

  const smtp = getSmtpConfig();
  const modName = "nodemailer";
  const nodemailer = (await import(modName)) as {
    default: {
      createTransport: (config: unknown) => {
        sendMail: (message: unknown) => Promise<unknown>;
      };
    };
  };

  const transporter = nodemailer.default.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  await transporter.sendMail({
    from: `${smtp.from.name} <${smtp.from.address}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { mode: "smtp" };
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
      <div style="font-family: Inter, Arial, sans-serif; color: #1f1720; line-height: 1.6;">
        <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #7a2936; margin-bottom: 8px;">
          Your SGIS student account is ready
        </h2>
        <p>Hello ${input.studentName},</p>
        <p>${input.parentName} has created your SGIS student portal account.</p>
        <p><strong>Login email:</strong> ${input.studentEmail}<br /><strong>Temporary password:</strong> ${input.password}</p>
        <p>Sign in at <a href="${loginUrl}">${loginUrl}</a> and change your password immediately after your first login.</p>
      </div>
    `,
  });
}
