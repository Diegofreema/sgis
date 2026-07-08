// POST /functions/v1/submit-application  (multipart/form-data)
// Port of legacy createPublicApplication. Validates the open period, dedupes by
// email, generates a unique code, uploads receipt + supporting docs (service
// role, so file validation stays server-side), inserts the application, emails
// a receipt. Fields mirror the legacy form; files: receipt, <doc keys>.
// → { success, data: { applicationCode } }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok, serverError } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/email.ts";

const DOCUMENTS_BUCKET = Deno.env.get("STORAGE_BUCKET_DOCUMENTS") ?? "documents";

// Supporting documents (mirror legacy APPLICATION_SUPPORTING_DOCUMENTS).
const SUPPORTING_DOCS = [
  { key: "completedSchoolEntranceForm", kind: "completed-school-entrance-form", allowPdf: true },
  { key: "passportOne", kind: "passport-1", allowPdf: false },
  { key: "passportTwo", kind: "passport-2", allowPdf: false },
  { key: "birthCertificate", kind: "birth-certificate", allowPdf: true },
  { key: "medicalFitnessReport", kind: "medical-fitness-report", allowPdf: true },
];
const MAX_RECEIPT_BYTES = 100 * 1024; // 100KB (legacy MAX_RECEIPT_UPLOAD_BYTES)
const MAX_DOC_BYTES = 500 * 1024; // 500KB (legacy APPLICATION_DOCUMENT_MAX_BYTES)

const REQUIRED_FIELDS = [
  "firstName", "lastName", "email", "phone", "dateOfBirth",
  "gender", "address", "intendedClass", "guardianName",
  "guardianPhone", "guardianEmail",
] as const;

// Per-field max lengths — reject oversized values before any upload/insert.
const MAX_LEN: Record<string, number> = {
  firstName: 80, lastName: 80, email: 160, phone: 32, dateOfBirth: 32,
  gender: 20, address: 300, state: 80, lga: 80, intendedClass: 80,
  previousSchool: 160, guardianName: 120, guardianPhone: 32, guardianEmail: 160,
};
const ALLOWED_GENDER = new Set(["male", "female"]);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Per-IP submission throttle (fixed window, enforced by hit_rate_limit RPC).
const SUBMIT_MAX = 5;
const SUBMIT_WINDOW_SECONDS = 60 * 60; // 1 hour

// Magic-byte sniffing (subset of legacy detectUploadType). Extend as needed.
function detectType(bytes: Uint8Array): { ext: string; mime: string } | null {
  if (bytes.length < 4) return null;
  const [a, b, c, d] = bytes;
  if (a === 0xff && b === 0xd8 && c === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (a === 0x89 && b === 0x50 && c === 0x4e && d === 0x47) return { ext: "png", mime: "image/png" };
  if (a === 0x25 && b === 0x50 && c === 0x44 && d === 0x46) return { ext: "pdf", mime: "application/pdf" };
  if (a === 0x52 && b === 0x49 && c === 0x46 && d === 0x46) return { ext: "webp", mime: "image/webp" };
  return null;
}

function genCode(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `SGISAPP${rand}`.slice(0, 16);
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const db = serviceClient();
    const now = new Date();

    // Throttle by client IP before doing any work (fail-open if the limiter
    // itself errors — never block a legit applicant on limiter trouble).
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const { data: allowed } = await db.rpc("hit_rate_limit", {
      p_key: `submit-application:${ip}`,
      p_max: SUBMIT_MAX,
      p_window_seconds: SUBMIT_WINDOW_SECONDS,
    });
    if (allowed === false) return fail("Too many submissions. Please try again later.", 429);

    // Active (open + in-window) period.
    const { data: periods } = await db
      .from("application_periods")
      .select("id, title, status, application_start_date, application_end_date")
      .eq("status", "open")
      .order("application_start_date", { ascending: false });
    const period = (periods ?? []).find(
      (p) => now >= new Date(p.application_start_date) && now <= new Date(p.application_end_date),
    );
    if (!period) return fail("Applications are currently closed.");

    const form = await req.formData();
    const field = (k: string) => String(form.get(k) ?? "").trim();

    for (const f of REQUIRED_FIELDS) {
      if (!field(f)) return fail(`Missing required field: ${f}`);
    }
    const email = field("email").toLowerCase();

    // Cheap field validation before any upload/insert/email.
    for (const [k, max] of Object.entries(MAX_LEN)) {
      if (field(k).length > max) return fail(`${k} is too long.`);
    }
    if (!EMAIL_RE.test(email)) return fail("A valid email is required.");
    if (!EMAIL_RE.test(field("guardianEmail"))) return fail("A valid guardian email is required.");
    if (!ALLOWED_GENDER.has(field("gender").toLowerCase())) return fail("Select a valid gender.");
    const dob = new Date(field("dateOfBirth"));
    if (Number.isNaN(dob.getTime()) || dob > now || dob < new Date("1900-01-01")) {
      return fail("Enter a valid date of birth.");
    }

    // Validate + read files.
    async function readFile(key: string, maxBytes: number, allowPdf: boolean) {
      const file = form.get(key);
      if (!(file instanceof File)) return { error: `Missing file: ${key}` } as const;
      if (file.size > maxBytes) return { error: `${key} exceeds size limit.` } as const;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const detected = detectType(bytes);
      if (!detected) return { error: `${key} has an unsupported file type.` } as const;
      if (detected.ext === "pdf" && !allowPdf) return { error: `${key} must be an image.` } as const;
      return { bytes, detected } as const;
    }

    const receipt = await readFile("receipt", MAX_RECEIPT_BYTES, false);
    if ("error" in receipt) return fail(receipt.error);

    const docs: Array<{ kind: string; bytes: Uint8Array; ext: string; mime: string }> = [];
    for (const d of SUPPORTING_DOCS) {
      const r = await readFile(d.key, MAX_DOC_BYTES, d.allowPdf);
      if ("error" in r) return fail(r.error);
      docs.push({ kind: d.kind, bytes: r.bytes, ext: r.detected.ext, mime: r.detected.mime });
    }

    // Dedupe by email within this period.
    const { data: dup } = await db
      .from("applications")
      .select("id")
      .eq("application_period_id", period.id)
      .eq("email", email)
      .maybeSingle();
    if (dup) return fail("An application already exists for this email in the current session.");

    const applicationCode = genCode();

    // Upload receipt + docs (service role).
    async function upload(kind: string, bytes: Uint8Array, ext: string, mime: string) {
      const path = `applications/${applicationCode}/${kind}.${ext}`;
      const { error } = await db.storage.from(DOCUMENTS_BUCKET).upload(path, bytes, { contentType: mime });
      if (error) throw new Error(error.message);
      return path;
    }
    const receiptPath = await upload("receipt", receipt.bytes, receipt.detected.ext, receipt.detected.mime);
    const documentPaths: string[] = [];
    for (const d of docs) documentPaths.push(await upload(d.kind, d.bytes, d.ext, d.mime));

    const { error: insErr } = await db.from("applications").insert({
      application_code: applicationCode,
      application_period_id: period.id,
      first_name: field("firstName"),
      last_name: field("lastName"),
      email,
      phone: field("phone"),
      date_of_birth: field("dateOfBirth"),
      gender: field("gender"),
      address: field("address"),
      state: field("state") || null,
      lga: field("lga") || null,
      intended_class: field("intendedClass"),
      previous_school: field("previousSchool") || null,
      guardian_name: field("guardianName"),
      guardian_phone: field("guardianPhone"),
      guardian_email: field("guardianEmail"),
      receipt_path: receiptPath,
      document_urls: documentPaths,
      status: "pending",
      submitted_at: now.toISOString(),
    });
    if (insErr) return serverError("submit-application:insert", insErr);

    try {
      await sendEmail({
        to: email,
        subject: "Application received",
        html: `<p>Hi ${field("firstName")}, we received your application for ${period.title}.</p>
               <p>Your application ID is <strong>${applicationCode}</strong>. Keep it safe — you'll need it to take the entrance exam.</p>`,
      });
    } catch (e) {
      console.error("[submit-application] email failed", e);
    }

    return ok({ applicationCode });
  } catch (error) {
    return serverError("submit-application", error);
  }
});
