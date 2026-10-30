export type RecentChat = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  searchText?: string;
};

const LABELS = ["Today", "Yesterday", "Previous 7 days", "Older"] as const;

function calendarDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function groupChats(chats: RecentChat[], now = new Date()) {
  const today = calendarDay(now);
  const groups = LABELS.map((label) => ({ label, chats: [] as RecentChat[] }));
  const timestamp = (chat: RecentChat) =>
    new Date(chat.updatedAt ?? chat.createdAt ?? "").getTime();
  const sorted = [...chats].sort((a, b) => (timestamp(b) || 0) - (timestamp(a) || 0));

  for (const chat of sorted) {
    const date = new Date(timestamp(chat));
    const age = today - calendarDay(date);
    const index = age <= 0 ? 0 : age === 1 ? 1 : age <= 7 ? 2 : 3;
    groups[index].chats.push(chat);
  }
  return groups.filter((group) => group.chats.length > 0);
}
