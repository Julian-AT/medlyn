import { describe, expect, it } from "vitest";
import { createDraftStore } from "./chat-drafts.ts";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("home chat drafts", () => {
  it("consumes a draft exactly once, including investigation context", () => {
    const session = storage();
    const drafts = createDraftStore(() => session);
    const draft = { text: "Example question", chipId: "example-chip", lensKey: "example-lens" };
    drafts.save("patient-a", "chat", draft);
    expect(drafts.take("patient-b", "chat")).toBeNull();
    expect(drafts.take("patient-a", "chat")).toEqual(draft);
    expect(drafts.take("patient-a", "chat")).toBeNull();
    expect(createDraftStore(() => session).take("patient-a", "chat")).toBeNull();
  });

  it("restores pending drafts across reload before sending", () => {
    const session = storage();
    createDraftStore(() => session).save("patient", "chat", { text: "Pending" });
    expect(createDraftStore(() => session).take("patient", "chat")).toEqual({ text: "Pending" });
  });

  it("uses memory when private mode blocks session storage", () => {
    const drafts = createDraftStore(() => {
      throw new Error("Denied");
    });
    drafts.save("patient", "chat", { text: "Pending" });
    expect(drafts.take("patient", "chat")).toEqual({ text: "Pending" });
    expect(drafts.take("patient", "chat")).toBeNull();
  });

  it("does not resend when removing from session storage fails", () => {
    const session = storage();
    const drafts = createDraftStore(() => session);
    drafts.save("patient", "chat", { text: "Pending" });
    session.removeItem = () => {
      throw new Error("Denied");
    };
    expect(drafts.take("patient", "chat")).toEqual({ text: "Pending" });
    expect(drafts.take("patient", "chat")).toBeNull();
  });

  it("ignores a malformed saved draft", () => {
    const session = storage();
    session.setItem("medlyn:chat-draft:patient:chat", "{invalid");
    expect(createDraftStore(() => session).take("patient", "chat")).toBeNull();
  });
});
