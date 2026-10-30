import type { UIMessage } from "ai";
import { z } from "zod";

const DEVICE_KEY = "medlyn:device:v1";
const DELETED = JSON.stringify({ version: 1, deleted: true });
const Message = z.looseObject({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.looseObject({ type: z.string() })),
});
const Chat = z.object({
  version: z.literal(1),
  id: z.string(),
  patientId: z.string(),
  title: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  messages: z.array(Message),
});

export type LocalChat = Omit<z.infer<typeof Chat>, "messages"> & { messages: UIMessage[] };
type StorageAccess = () => Storage;

/** Browser-owned chats, with one storage key per device, patient and conversation. */
export function createChatStore(storage: StorageAccess, randomId = () => crypto.randomUUID()) {
  const memory = new Map<string, string>();
  const listeners = new Set<() => void>();
  let persistent = true;
  let deviceId: string | undefined;

  function read(key: string) {
    if (!persistent) return memory.get(key) ?? null;
    try {
      const value = storage().getItem(key);
      if (value === null) memory.delete(key);
      else memory.set(key, value);
      return value;
    } catch {
      persistent = false;
      return memory.get(key) ?? null;
    }
  }

  function write(key: string, value: string | null) {
    if (value === null) memory.delete(key);
    else memory.set(key, value);
    if (!persistent) return;
    try {
      if (value === null) storage().removeItem(key);
      else storage().setItem(key, value);
    } catch {
      persistent = false;
    }
  }

  function device() {
    if (deviceId) return deviceId;
    const stored = read(DEVICE_KEY);
    const parsed = z.uuid().safeParse(stored);
    deviceId = parsed.success ? parsed.data : randomId();
    write(DEVICE_KEY, deviceId);
    return deviceId;
  }

  function prefix(patientId: string) {
    return `medlyn:chats:v1:${device()}:${encodeURIComponent(patientId)}:`;
  }

  function key(patientId: string, id: string) {
    return `${prefix(patientId)}${encodeURIComponent(id)}`;
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  function load(patientId: string, id: string): LocalChat | null {
    const raw = read(key(patientId, id));
    if (!raw) return null;
    try {
      const parsed = Chat.safeParse(JSON.parse(raw));
      if (!parsed.success || parsed.data.patientId !== patientId || parsed.data.id !== id)
        return null;
      // Full AI SDK validation runs before a stored conversation is displayed.
      return parsed.data as LocalChat;
    } catch {
      return null;
    }
  }

  return {
    deviceId: device,
    isPersistent: () => persistent,
    load,
    list(patientId: string) {
      const start = prefix(patientId);
      let keys = [...memory.keys()];
      if (persistent) {
        try {
          const target = storage();
          keys = Array.from({ length: target.length }, (_, index) => target.key(index) ?? "");
        } catch {
          persistent = false;
        }
      }
      return keys
        .filter((entry) => entry.startsWith(start))
        .flatMap((entry) => {
          try {
            const chat = load(patientId, decodeURIComponent(entry.slice(start.length)));
            return chat ? [chat] : [];
          } catch {
            return [];
          }
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    save(patientId: string, id: string, messages: UIMessage[]) {
      if (!messages.length) return;
      if (read(key(patientId, id)) === DELETED) return;
      const previous = load(patientId, id);
      if (previous && JSON.stringify(previous.messages) === JSON.stringify(messages)) return;
      const now = new Date().toISOString();
      const question = messages.find((message) => message.role === "user");
      const text = question?.parts
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join(" ");
      const chat: LocalChat = {
        version: 1,
        id,
        patientId,
        title: text?.replace(/\s+/g, " ").trim().slice(0, 80) || "New conversation",
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        messages,
      };
      write(key(patientId, id), JSON.stringify(chat));
      notify();
    },
    remove(patientId: string, id: string) {
      // Erase message content while preventing an in-flight response from restoring it.
      write(key(patientId, id), DELETED);
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let browserStore: ReturnType<typeof createChatStore> | undefined;

export function chatStore() {
  browserStore ??= createChatStore(() => window.localStorage);
  return browserStore;
}
