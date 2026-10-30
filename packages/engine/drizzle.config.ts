import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";
import { required } from "./required.ts";

const rootEnv = "../../.env";
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
// biome-ignore lint/style/noDefaultExport: The tool discovers its configuration through the default export.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  dbCredentials: { url: required(process.env.DATABASE_URL) },
});
