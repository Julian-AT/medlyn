type Message = { id: string; role: "user" | "assistant" };

/** Keep saved answer versions, displaying the latest version for each user turn. */
export function visibleChatMessages<T extends Message>(messages: T[]): T[] {
  const visible: T[] = [];
  for (const message of messages) {
    if (message.role === "assistant" && visible.at(-1)?.role === "assistant")
      visible[visible.length - 1] = message;
    else visible.push(message);
  }
  return visible;
}

export function historyBeforeQuestion<T extends Message>(messages: T[], questionId: string): T[] {
  const index = messages.findIndex(
    (message) => message.id === questionId && message.role === "user",
  );
  return visibleChatMessages(index < 0 ? messages : messages.slice(0, index));
}

/** The key is only a reference; chatContext validates its patient, revision and window. */
export function conversationLensKey(
  messages: { parts: { type: string; data?: unknown }[] }[],
  explicit?: string | null,
): string | null {
  if (explicit) return explicit;
  const data = messages
    .flatMap((message) => message.parts)
    .findLast((part) => part.type === "data-evidence-context")?.data;
  if (!data || typeof data !== "object" || !("lensKey" in data)) return null;
  return typeof data.lensKey === "string" && data.lensKey.length <= 300 ? data.lensKey : null;
}
