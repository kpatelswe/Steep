import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resend } from "resend";
import { config, isProd } from "../config.js";
import { logger } from "../logger.js";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  id: string;
  /** True when the email was written to the local outbox instead of sent. */
  dryRun: boolean;
}

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;
const OUTBOX = join(process.cwd(), ".preview", "outbox");

/**
 * Send through Resend. Without an API key (local dev) the message is written to
 * .preview/outbox so you can open it in a browser, and the subject is logged.
 */
export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  if (!resend) {
    if (isProd) throw new Error("RESEND_API_KEY is not set");
    mkdirSync(OUTBOX, { recursive: true });
    const id = `dev-${Date.now()}`;
    const file = join(OUTBOX, `${id}.html`);
    writeFileSync(file, msg.html);
    logger.info({ to: msg.to, subject: msg.subject, file }, "email (dry run) written to outbox");
    return { id, dryRun: true };
  }
  const { data, error } = await resend.emails.send({
    from: config.FROM_EMAIL,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    headers: msg.headers,
  });
  if (error || !data) throw new Error(`Resend: ${error?.name ?? "unknown"} ${error?.message ?? ""}`.trim());
  return { id: data.id, dryRun: false };
}
