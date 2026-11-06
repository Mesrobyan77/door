import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { requireDatabaseUrl } from "@/config/env";
import * as schema from "@/db/schema";

neonConfig.webSocketConstructor = ws;

type TransactionCallback = Parameters<
  ReturnType<typeof drizzle<typeof schema>>["transaction"]
>[0];
type Transaction = Parameters<TransactionCallback>[0];

/** Executes a critical commerce mutation in a PostgreSQL transaction. */
export async function withTransaction<T>(
  operation: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const pool = new Pool({ connectionString: requireDatabaseUrl() });
  const db = drizzle({ client: pool, schema });
  try {
    return await db.transaction(operation);
  } finally {
    await pool.end();
  }
}
