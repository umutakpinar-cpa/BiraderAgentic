import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  META_VERIFY_TOKEN: z.string().min(1, "META_VERIFY_TOKEN zorunludur"),
  META_ACCESS_TOKEN: z.string().min(1, "META_ACCESS_TOKEN zorunludur"),
  META_APP_SECRET: z.string().min(1, "META_APP_SECRET zorunludur"),
  SERPAPI_KEY: z.string().min(1, "SERPAPI_KEY zorunludur"),
  DATABASE_URL: z.string().url("DATABASE_URL geçerli bir URL olmalıdır"),
  ALLOWED_MARKETPLACE_DOMAINS: z
    .string()
    .min(1, "ALLOWED_MARKETPLACE_DOMAINS zorunludur")
    .transform((value) =>
      value
        .split(",")
        .map((domain) => domain.trim().toLowerCase())
        .filter((domain) => domain.length > 0)
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Ortam değişkenleri geçersiz:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
