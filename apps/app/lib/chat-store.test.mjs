import { safeValidateUIMessages } from "ai";
import { describe, expect, it } from "vitest";
import { createChatStore } from "./chat-store.ts";

const deviceA = "cd5e7de3-89a0-4e98-9ac3-a31a7f50a374";
const deviceB = "f27bb183-34a7-4a86-a6e8-c134ceaa4d44";
const question = {
  id: "q1",
  role: "user",
  parts: [{ type: "text", text: "  Example\n question  " }],
};
const answer = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Example answer" }] };

function memoryStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("browser-owned chat history", () => {
  it("restores complete UI messages, metadata and tool receipts after a reload", async () => {
    const storage = memoryStorage();
    const first = createChatStore(
      () => storage,
      () => deviceA,
    );
    const messages = [
      question,
      {
        ...answer,
        metadata: { checked: true },
        parts: [
          ...answer.parts,
          {
            type: "tool-example",
            toolCallId: "call-1",
            state: "output-available",
            input: {},
            output: { checked: true },
          },
          { type: "data-example", data: { validationKey: "example-receipt" } },
        ],
      },
    ];
    first.save("patient-a", "chat-a", messages);
    const reloaded = createChatStore(
      () => storage,
      () => deviceB,
    );
    const restored = reloaded.load("patient-a", "chat-a");
    expect(reloaded.deviceId()).toBe(deviceA);
    expect(restored.messages).toEqual(messages);
    expect(restored.title).toBe("Example question");
    expect((await safeValidateUIMessages({ messages: restored.messages })).success).toBe(true);
  });

  it("keeps patients and independently generated device identities separate", () => {
    const storage = memoryStorage();
    const first = createChatStore(
      () => storage,
      () => deviceA,
    );
    first.save("patient-a", "same-chat", [question]);
    first.save("patient-b", "same-chat", [answer]);
    expect(first.load("patient-b", "same-chat").messages).toEqual([answer]);
    expect(first.list("patient-c")).toEqual([]);
    storage.removeItem("medlyn:device:v1");
    const otherDevice = createChatStore(
      () => storage,
      () => deviceB,
    );
    expect(otherDevice.list("patient-a")).toEqual([]);
    expect(otherDevice.load("patient-a", "same-chat")).toBeNull();
  });

  it("replaces regenerated answers while retaining the user turn and creation date", () => {
    const storage = memoryStorage();
    const browser = createChatStore(
      () => storage,
      () => deviceA,
    );
    browser.save("patient", "chat", [question, answer]);
    const created = browser.load("patient", "chat").createdAt;
    const replacement = { ...answer, id: "retry", parts: [{ type: "text", text: "Replacement" }] };
    browser.save("patient", "chat", [question, replacement]);
    expect(browser.load("patient", "chat").messages.map((message) => message.id)).toEqual([
      "q1",
      "retry",
    ]);
    expect(browser.load("patient", "chat").createdAt).toBe(created);
  });

  it("erases message content on delete and ignores late streamed saves in both tabs", () => {
    const storage = memoryStorage();
    const first = createChatStore(
      () => storage,
      () => deviceA,
    );
    const second = createChatStore(
      () => storage,
      () => deviceB,
    );
    first.save("patient", "chat", [question]);
    expect(second.list("patient")).toHaveLength(1);
    second.remove("patient", "chat");
    first.save("patient", "chat", [question, answer]);
    expect(first.load("patient", "chat")).toBeNull();
    expect(second.list("patient")).toEqual([]);
    const values = Array.from({ length: storage.length }, (_, index) =>
      storage.getItem(storage.key(index)),
    );
    expect(values.join("")).not.toContain("Example");
  });

  it("retains changes from concurrent tabs by writing each chat separately", () => {
    const storage = memoryStorage();
    const first = createChatStore(
      () => storage,
      () => deviceA,
    );
    const second = createChatStore(
      () => storage,
      () => deviceB,
    );
    first.save("patient", "one", [question]);
    second.save("patient", "two", [question]);
    expect(
      first
        .list("patient")
        .map((chat) => chat.id)
        .sort(),
    ).toEqual(["one", "two"]);
  });

  it("uses memory when storage access is denied", () => {
    const store = createChatStore(
      () => {
        throw new Error("Storage denied");
      },
      () => deviceA,
    );
    store.save("patient", "chat", [question, answer]);
    expect(store.isPersistent()).toBe(false);
    expect(store.list("patient")).toHaveLength(1);
    expect(store.load("patient", "chat").messages).toEqual([question, answer]);
    store.remove("patient", "chat");
    expect(store.list("patient")).toEqual([]);
  });

  it("keeps existing and newly changed chats in memory when the quota is exceeded", () => {
    const storage = memoryStorage();
    const store = createChatStore(
      () => storage,
      () => deviceA,
    );
    store.save("patient", "existing", [question]);
    storage.setItem = () => {
      throw new Error("Quota exceeded");
    };
    store.save("patient", "new", [question, answer]);
    expect(store.isPersistent()).toBe(false);
    expect(store.list("patient")).toHaveLength(2);
  });

  it("ignores corrupted records, malformed keys and mismatched patient identities", () => {
    const storage = memoryStorage();
    const store = createChatStore(
      () => storage,
      () => deviceA,
    );
    store.save("patient", "chat", [question]);
    const key = Array.from({ length: storage.length }, (_, index) => storage.key(index)).find(
      (key) => key.startsWith("medlyn:chats:"),
    );
    const original = JSON.parse(storage.getItem(key));
    storage.setItem(key, JSON.stringify({ ...original, patientId: "other-patient" }));
    expect(store.load("patient", "chat")).toBeNull();
    storage.setItem(key, "invalid-json");
    storage.setItem(`${key.slice(0, -4)}%xx`, "invalid-json");
    expect(store.list("patient")).toEqual([]);
  });

  it("notifies all local subscribers and does not treat reloading as new activity", () => {
    const storage = memoryStorage();
    const store = createChatStore(
      () => storage,
      () => deviceA,
    );
    let updates = 0;
    const unsubscribe = store.subscribe(() => {
      updates++;
    });
    store.save("patient", "chat", [question]);
    const saved = store.load("patient", "chat");
    store.save("patient", "chat", [question]);
    expect(store.load("patient", "chat").updatedAt).toBe(saved.updatedAt);
    expect(updates).toBe(1);
    unsubscribe();
    store.remove("patient", "chat");
    expect(updates).toBe(1);
  });
});
