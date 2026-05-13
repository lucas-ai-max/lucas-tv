import "server-only";

import { Pool } from "pg";
import type { QueryResultRow } from "pg";

declare global {
  var lucasTvPool: Pool | undefined;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function createPool() {
  return new Pool({
    host: requiredEnv("SUPABASE_DB_HOST"),
    port: Number(requiredEnv("SUPABASE_DB_PORT")),
    database: requiredEnv("SUPABASE_DB_NAME"),
    user: requiredEnv("SUPABASE_DB_USER"),
    password: requiredEnv("SUPABASE_DB_PASSWORD"),
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
}

function getPool() {
  if (!globalThis.lucasTvPool) {
    globalThis.lucasTvPool = createPool();
  }

  return globalThis.lucasTvPool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return getPool().query<T>(text, params);
}
