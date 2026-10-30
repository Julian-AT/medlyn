"use client";

import { BubbleChatIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { groupChats } from "@/components/shell/chat-history";
import { useChatHistory } from "@/components/shell/hooks/use-chat-history";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function ChatList() {
  const { chats, status } = useChatHistory();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groupChats(
      needle ? chats.filter((chat) => chat.title.toLowerCase().includes(needle)) : chats,
    );
  }, [chats, query]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
        <p className="text-sm text-muted-foreground">Every conversation about this patient.</p>
      </header>
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="h-10 rounded-[10px] border-0 bg-muted pl-9 shadow-none"
        />
      </div>
      {status === "loading" && <Skeleton className="h-40 w-full rounded-xl" />}
      {status === "ready" && groups.length === 0 && (
        <Empty className="border-0">
          <EmptyTitle>{query ? "No matching chats" : "No chats yet"}</EmptyTitle>
          <EmptyDescription>
            {query ? "Try a different search." : "Ask a question on the home page to start one."}
          </EmptyDescription>
        </Empty>
      )}
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-1">
          <h2 className="mb-1 ml-1.5 text-sm font-medium text-muted-foreground">{group.label}</h2>
          <ul className="flex flex-col">
            {group.chats.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm hover:bg-muted"
                >
                  <HugeiconsIcon
                    icon={BubbleChatIcon}
                    strokeWidth={2}
                    className="size-[18px] shrink-0 text-muted-foreground"
                  />
                  <span className="flex-1 truncate font-medium">{chat.title}</span>
                  {chat.updatedAt && (
                    <time
                      dateTime={chat.updatedAt}
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                    >
                      {time.format(new Date(chat.updatedAt))}
                    </time>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
