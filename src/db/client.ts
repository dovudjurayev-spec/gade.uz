import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// On shared hosting (Passenger) a small pool is safer than the default.
const queryClient = postgres(connectionString, {
  max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  idle_timeout: 20,
  prepare: false,
});

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
