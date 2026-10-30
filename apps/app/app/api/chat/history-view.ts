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
