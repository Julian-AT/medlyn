import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Screen } from "@medlyn/engine/contracts";
import { expect, type Page, test } from "@playwright/test";
import { required } from "../../packages/engine/required.ts";
import { loadRegression, outputRoot } from "../data.ts";
import type { Row } from "../run.ts";
import { cards, collectScreen } from "../screen.ts";

async function fromBody(body: string): Promise<Screen> {
  async function* events() {
    for (const line of body.split("\n")) if (line.trim()) yield JSON.parse(line);
  }
  return collectScreen(events());
}
async function submit(page: Page, index: number) {
  const responseJob = page.waitForResponse(
    (response) => response.url().endsWith("/api/lens") && response.request().method() === "POST",
  );
  const started = performance.now();
  await page.locator('[aria-label="Clinical situations"] button').nth(index).click();
  const response = await responseJob;
  expect(response.ok()).toBeTruthy();
  if (process.env.EVAL_MOCK !== "1") expect(response.headers()["x-medlyn-mode"]).not.toBe("mock");
  const screen = await fromBody(await response.text());
  await expect(page.locator('[data-lens-state="done"]')).toBeVisible();
  return { screen, ms: performance.now() - started };
}
for (let index = 0; index < 5; index++) {
  test(`situation ${index + 1}: answering cards visible; cold and warm timing`, async ({
    page,
  }, testInfo) => {
    const situations = await loadRegression();
    const situation = situations[index];
    const regression: {
      rows: Row[];
    } = JSON.parse(await readFile(path.join(outputRoot, "regression.json"), "utf8"));
    const expected = regression.rows.filter((r) => r.id.startsWith(`${situation.id}.`));
    expect(expected).toHaveLength(3);
    let cold = true;
    await page.route("**/api/lens", async (route) => {
      const body = route.request().postDataJSON();
      delete body.sessionId;
      await route.continue({ postData: JSON.stringify({ ...body, noCache: cold }) });
    });
    await page.route("**/api/review?*", (route) => route.fulfill({ json: [] }));
    await page.goto("/");
    await expect(
      page.locator("[data-lens-state]"),
      "Lens canvas must expose its evaluation state",
    ).toHaveCount(1);
    await expect(page.locator('[data-lens-state="done"]')).toBeVisible({ timeout: 120000 });
    const first = await submit(page, index);
    cold = false;
    await submit(page, index);
    const warm = await submit(page, index);
    const visibleQuestions: string[] = [];
    for (const question of expected) {
      expect(
        question.answeringCardIds.length,
        `Judge must identify answering cards for ${question.id}`,
      ).toBeGreaterThan(0);
      for (const id of question.answeringCardIds) {
        const providerCard =
          question.capture && cards(question.capture.screen).find((c) => c.id === id);
        const streamedCard = cards(warm.screen).find(
          (c) => c.id === id || c.needId === providerCard?.needId,
        );
        expect(streamedCard, `Answering card ${id} missing from chip screen`).toBeDefined();
        const card = page.locator(`[data-card-id=${JSON.stringify(required(streamedCard).id)}]`);
        await expect(card).toHaveCount(1);
        await expect(card).toBeVisible();
        expect(
          await card.evaluate((node) =>
            Boolean(node.closest('[hidden], [aria-hidden="true"], details:not([open])')),
          ),
        ).toBe(false);
        for (const line of required(streamedCard).lines.filter(
          (l) => l.validation.support === "supported",
        )) {
          if (required(streamedCard).availability === "documented")
            await expect(card.locator(`[data-claim-id=${JSON.stringify(line.id)}]`)).toBeVisible();
        }
        if (required(streamedCard).availability === "not_documented")
          await expect(card).toContainText("Not documented");
      }
      visibleQuestions.push(question.id);
    }
    const timing = {
      situationId: situation.id,
      coldMs: first.ms,
      warmMs: warm.ms,
      cached: warm.screen.timings.cached,
      visibleQuestions,
      mock: process.env.EVAL_MOCK === "1",
    };
    await writeFile(
      path.join(outputRoot, `visibility-${situation.id}.json`),
      `${JSON.stringify(timing, null, 2)}\n`,
    );
    await testInfo.attach("visibility-and-timing", {
      body: JSON.stringify(timing),
      contentType: "application/json",
    });
    if (process.env.EVAL_MOCK !== "1") {
      expect
        .soft(warm.screen.timings.cached, "Warm screen must confirm a real cache hit")
        .toBe(true);
      expect.soft(first.ms, "Cold submit-to-complete target").toBeLessThan(5000);
      expect.soft(warm.ms, "Warm submit-to-complete target").toBeLessThan(1000);
    }
  });
}
