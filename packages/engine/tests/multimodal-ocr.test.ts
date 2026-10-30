import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ocrPage } from "../ingest/multimodal/ocr.ts";
import type { Page } from "../ingest/multimodal/types.ts";

afterEach(() => vi.unstubAllEnvs());

describe("OCR transport boundary", () => {
  it.each(["http", "partial"])("sends images and falls back after %s failure", async (failure) => {
    const directory = await mkdtemp("/private/tmp/medlyn-ocr-test-");
    const imagePath = `${directory}/page.png`;
    await writeFile(imagePath, Buffer.from("png-placeholder"));
    const requests: { model: string; messages: { content: unknown }[] }[] = [];
    const server = createServer(async (request, response) => {
      const parts: Buffer[] = [];
      for await (const part of request) parts.push(Buffer.from(part));
      const body = JSON.parse(Buffer.concat(parts).toString());
      requests.push(body);
      if (body.model === "fast-test" && failure === "http") {
        response.writeHead(400).end();
        return;
      }
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  blank: false,
                  lines: [
                    {
                      text: body.model === "fast-test" ? "[unleserlich]" : "Messwert 7 mm.",
                      bbox: { x0: 0.1, y0: 0.1, x1: 0.8, y1: 0.2 },
                    },
                  ],
                }),
              },
            },
          ],
        }),
      );
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing local proxy address");
    vi.stubEnv("OPENAI_BASE_URL", `http://127.0.0.1:${address.port}/v1`);
    vi.stubEnv("MODEL_FAST", "fast-test");
    vi.stubEnv("MODEL_REASONING", "reasoning-test");
    const page: Page = {
      page: 1,
      imagePath,
      width: 100,
      height: 200,
      dpi: 200,
      source: "scan",
      lines: [],
    };
    try {
      const result = await ocrPage(page, { timeoutMs: 1000 });
      expect(result.page.source).toBe("ocr");
      expect(result.page.lines[0].text).toBe("Messwert 7 mm.");
      expect(result.timing?.role).toBe("reasoning");
      expect(requests.map((request) => request.model)).toEqual([
        "fast-test",
        "fast-test",
        "reasoning-test",
      ]);
      expect(JSON.stringify(requests[0].messages[1].content)).toContain("data:image/png;base64,");
      expect(JSON.stringify(requests[0])).toContain("json_schema");
      expect(await ocrPage({ ...page, source: "embedded" })).toEqual({
        page: { ...page, source: "embedded" },
        timing: null,
      });
      expect(requests).toHaveLength(3);
      await expect(ocrPage(page, { roles: [] })).rejects.toThrow("OCR unavailable");
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await rm(directory, { recursive: true, force: true });
    }
  });
});
