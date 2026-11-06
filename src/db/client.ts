import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { requireDatabaseUrl } from "@/config/env";
import * as schema from "@/db/schema";

export type Database = NeonHttpDatabase<typeof schema>;

let cachedDb: Database | undefined;

/** Shared Drizzle client for server-side queries. */
export function getDb(): Database {
  if (!cachedDb) {
    const sql = neon(requireDatabaseUrl());
    cachedDb = drizzle(sql, { schema });
  }

  return cachedDb;
}
