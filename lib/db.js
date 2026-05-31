import { neon } from "@neondatabase/serverless";

let sqlClient = null;

export function hasDatabaseUrl() {
  return Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export function getSql() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("POSTGRES_URL or DATABASE_URL is not configured");
  }

  if (!sqlClient) {
    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}
