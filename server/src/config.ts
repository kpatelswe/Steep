import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional().default(""),
  FROM_EMAIL: z.string().default("Steep <onboarding@resend.dev>"),
  JWT_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(16),
  VERCEL: z.string().optional(),
});

export type Config = z.infer<typeof schema>;

function load(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}

export const config = load();
export const isServerless = Boolean(config.VERCEL);
export const isProd = config.NODE_ENV === "production";
