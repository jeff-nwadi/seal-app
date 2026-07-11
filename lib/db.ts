/**
 * Database client (server-only).
 *
 * The `postgres` driver is what AGENTS.md calls out for Neon serverless.
 * We pass the pooled connection string (the one with `-pooler` in the host)
 * so serverless runtimes don't exhaust connections.
 *
 * `db` is only ever imported from server contexts — Server Components,
 * Route Handlers, Better Auth, Drizzle Kit, etc. It must never cross into
 * a Client Component bundle.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy `.env.example` to `.env` and fill it in.",
  );
}

// `max: 1` matches Neon's recommendation for serverless functions — each
// invocation gets one connection that is released back to the pool on idle.
const client = postgres(connectionString, { max: 1, prepare: false });

export const db = drizzle(client, { schema });
export type DB = typeof db;
