import { loadLocalEnv } from "@/lib/env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

loadLocalEnv();

const client = createClient({
  url: process.env.DATABASE_URL?.trim() || "file:local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
});

export const db = drizzle(client, { schema });
