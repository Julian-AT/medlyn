import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

const rootEnv = "../../.env";
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
