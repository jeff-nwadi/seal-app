import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Drizzle Kit config.
 *
 * The schema is owned by `drizzle/schema.ts` (which the Better Auth CLI
 * regenerates the `user`/`session`/`account`/`verification` table definitions
 * into). Hand-authored tables (`capsule`, etc.) live in the same file below
 * the generated block. Migrations land in `./drizzle/migrations` and should
 * be committed.
 *
 * We read `.env` manually here so `drizzle-kit` commands (`generate`,
 * `migrate`, `studio`) work without requiring `dotenv-cli` or a wrapper
 * script. Real env values still only enter this process — they are
 * consumed by the Postgres driver, not echoed to stdout.
 */
function loadEnv(): void {
  // Best-effort: if `.env` is missing or the var is already set, no-op.
  // We avoid throwing because `drizzle-kit generate` doesn't always need
  // a live connection.
  try {
    const envPath = join(process.cwd(), ".env");
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // Strip surrounding quotes (single or double)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env missing — fine if the env was provided another way.
  }
}

loadEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
