import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "../../db/client.ts";
import { chats } from "../../db/schema.ts";
import { PATIENT_ID } from "../../store.ts";
import { chatTitle, loadChat, saveAssistantMessage, saveUserMessage } from "./history.ts";

describe("chat titles", () => {
  it("normalises whitespace and bounds the first user message without a model call", () => {
    expect(chatTitle("  A synthetic\n question  ")).toBe("A synthetic question");
    expect(chatTitle("a".repeat(100))).toHaveLength(80);
    expect(chatTitle(" \n ")).toBe("New conversation");
  });
});

describe.skipIf(!process.env.DATABASE_URL)("Neon chat persistence", () => {
  const ids = [randomUUID(), randomUUID()];
  afterAll(async () => {
    for (const id of ids) await getDb().delete(chats).where(eq(chats.id, id));
  });

  it("reloads message parts, preserves the original title and deduplicates a retry", async () => {
    const user = {
      id: "synthetic-user",
      role: "user" as const,
      parts: [{ type: "text", text: "Synthetic persistence check" }],
    };
    await saveUserMessage(ids[0], user);
    await saveUserMessage(ids[0], user);
    await saveAssistantMessage(ids[0], {
      id: randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "tool-synthetic_check",
          toolCallId: "check",
          state: "output-available",
          input: {},
          output: { checked: true },
        },
      ],
    });
    await saveUserMessage(ids[0], {
      ...user,
      id: "followup",
      parts: [{ type: "text", text: "Follow-up" }],
    });
    const reloaded = await loadChat(ids[0]);
    expect(reloaded?.title).toBe("Synthetic persistence check");
    expect(reloaded?.messages).toHaveLength(3);
    expect(reloaded?.messages[0].id).toBe(user.id);
    expect(reloaded?.messages[1].parts[0]).toMatchObject({
      type: "tool-synthetic_check",
      output: { checked: true },
    });
  });

  it("isolates a repeated client message id by chat and scopes reads by patient", async () => {
    await saveUserMessage(ids[1], {
      id: "synthetic-user",
      role: "user",
      parts: [{ type: "text", text: "Separate conversation" }],
    });
    expect((await loadChat(ids[1]))?.messages).toHaveLength(1);
    expect(await loadChat(ids[1], `${PATIENT_ID}-other`)).toBeNull();
    expect(await loadChat(randomUUID())).toBeNull();
  });
});
