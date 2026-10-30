import { z } from "zod";

const Draft = z.object({
  text: z.string().min(1),
  chipId: z.string().optional(),
  lensKey: z.string().optional(),
});
type ChatDraft = z.infer<typeof Draft>;

/** Session drafts are consumed once, including when browser storage is blocked. */
export function createDraftStore(storage: () => Storage) {
  const memory = new Map<string, ChatDraft>();
  const consumed = new Set<string>();
  const key = (patientId: string, id: string) =>
    `medlyn:chat-draft:${encodeURIComponent(patientId)}:${id}`;
  return {
    save(patientId: string, id: string, draft: ChatDraft) {
      const name = key(patientId, id);
      memory.set(name, draft);
      try {
        storage().setItem(name, JSON.stringify(draft));
      } catch {
        // The in-memory draft survives client navigation in restricted browsers.
        return;
      }
    },
    take(patientId: string, id: string): ChatDraft | null {
      const name = key(patientId, id);
      if (consumed.has(name)) return null;
      consumed.add(name);
      const fallback = memory.get(name) ?? null;
      memory.delete(name);
      try {
        const raw = storage().getItem(name);
        storage().removeItem(name);
        if (!raw) return fallback;
        const parsed = Draft.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : fallback;
      } catch {
        return fallback;
      }
    },
  };
}

export const chatDrafts = createDraftStore(() => window.sessionStorage);
