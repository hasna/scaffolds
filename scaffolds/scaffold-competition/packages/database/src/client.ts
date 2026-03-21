import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

function getConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (!globalForDb.conn) {
    globalForDb.conn = postgres(process.env.DATABASE_URL, {
      max: parseInt(process.env.DB_POOL_SIZE ?? "10", 10),
      ssl: process.env.NODE_ENV === "production" ? "require" : false,
    });
  }

  return globalForDb.conn;
}

export const db = drizzle(getConnection(), { schema });

export type Database = typeof db;
