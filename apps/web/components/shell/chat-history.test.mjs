import { describe, expect, it } from "vitest";
import { groupChats } from "./chat-history.ts";

const now = new Date(2026, 9, 30, 14);
const at = (day, hour = 12) => new Date(2026, 9, day, hour).toISOString();

describe("chat history calendar groups", () => {
  it("groups calendar days instead of elapsed 24-hour periods", () => {
    const result = groupChats(
      [
        { id: "older", title: "Older", updatedAt: at(22) },
        { id: "week", title: "Week", updatedAt: at(23) },
        { id: "yesterday", title: "Yesterday", updatedAt: at(29, 23) },
        { id: "today", title: "Today", updatedAt: at(30, 1) },
      ],
      now,
    );
    expect(result.map((group) => [group.label, group.chats[0].id])).toEqual([
      ["Today", "today"],
      ["Yesterday", "yesterday"],
      ["Previous 7 days", "week"],
      ["Older", "older"],
    ]);
  });

  it("sorts by last activity and leaves its input unchanged", () => {
    const chats = [
      { id: "early", title: "First", createdAt: at(30, 1) },
      { id: "late", title: "Last", createdAt: at(29), updatedAt: at(30, 13) },
    ];
    expect(groupChats(chats, now)[0].chats.map((chat) => chat.id)).toEqual(["late", "early"]);
    expect(chats[0].id).toBe("early");
  });

  it("puts missing or invalid dates under Older and skips empty groups", () => {
    expect(
      groupChats(
        [
          { id: "a", title: "A" },
          { id: "b", title: "B", updatedAt: "bad" },
        ],
        now,
      ),
    ).toEqual([
      {
        label: "Older",
        chats: [
          { id: "a", title: "A" },
          { id: "b", title: "B", updatedAt: "bad" },
        ],
      },
    ]);
    expect(groupChats([], now)).toEqual([]);
  });

  it("handles the daylight-saving boundary as local calendar days", () => {
    expect(
      groupChats([{ id: "a", title: "A", updatedAt: at(24, 23) }], new Date(2026, 9, 26, 0, 30))[0]
        .label,
    ).toBe("Previous 7 days");
  });
});
