import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { getDb } from "../client.ts";

/** Run before db:push with --extensions-only, then again after it for the BM25 index. */
export async function applySearchSql(extensionsOnly = false) {
  const source = await readFile(new URL("./001-search.pgsql", import.meta.url), "utf8");
  for (const statement of source
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)) {
    if (extensionsOnly && !statement.startsWith("CREATE EXTENSION")) continue;
    try {
      await getDb().execute(sql.raw(statement));
    } catch (error) {
      const cause = error instanceof Error ? error.cause : undefined;
      if (
        statement.includes("pg_search") &&
        cause instanceof Error &&
        cause.message.includes("deprecated and no longer allowed")
      ) {
        console.warn("pg_search_unavailable", {
          reason: cause.message,
          fallback: "scoped in-process BM25",
        });
        continue;
      }
      if (statement.includes("USING bm25")) {
        const extension = await getDb().execute(
          sql`select 1 from pg_extension where extname = 'pg_search'`,
        );
        if (!extension.rows.length) {
          console.warn("bm25_index_skipped", { reason: "pg_search installation is unavailable" });
          continue;
        }
      }
      throw error;
    }
  }
  console.info("search_sql_applied", { extensionsOnly });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  applySearchSql(process.argv.includes("--extensions-only")).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
