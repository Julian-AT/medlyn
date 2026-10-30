"use client";

import { BubbleChatIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { groupChats } from "@/components/shell/chat-history";
import { useChatHistory } from "@/components/shell/hooks/use-chat-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatStorageNotice } from "./chat-storage-notice";

const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function ChatList() {
  const { chats, status, remove } = useChatHistory();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groupChats(
      needle
        ? chats.filter((chat) =>
            `${chat.title} ${chat.searchText ?? ""}`.toLowerCase().includes(needle),
          )
        : chats,
    );
  }, [chats, query]);

  return (
    <Card className="mx-auto w-full max-w-3xl gap-6 border-0 bg-transparent px-6 py-10 shadow-none ring-0">
      <CardHeader className="gap-1 px-0">
        <CardTitle role="heading" aria-level={1} className="text-2xl">
          Chats
        </CardTitle>
        <CardDescription>Conversations about this patient, saved in this browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="h-10 rounded-[10px] border-0 bg-muted shadow-none"
        />
        <ChatStorageNotice />
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
          <Card key={group.label} className="gap-1 border-0 bg-transparent py-0 shadow-none ring-0">
            <CardHeader className="px-1.5 pb-1">
              <CardTitle
                role="heading"
                aria-level={2}
                className="text-sm font-medium text-muted-foreground"
              >
                {group.label}
              </CardTitle>
            </CardHeader>
            <CardContent role="list" className="space-y-1 px-0">
              {group.chats.map((chat) => (
                <Card
                  key={chat.id}
                  role="listitem"
                  className="flex-row items-center gap-1 border-0 bg-transparent py-0 shadow-none ring-0"
                >
                  <Button
                    variant="ghost"
                    asChild
                    className="h-11 min-w-0 flex-1 justify-start gap-3 px-3"
                  >
                    <Link href={`/chat/${chat.id}`}>
                      <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} />
                      <CardTitle className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                        {chat.title}
                      </CardTitle>
                      {chat.updatedAt && (
                        <CardDescription className="shrink-0 text-xs tabular-nums">
                          <time dateTime={chat.updatedAt}>
                            {time.format(new Date(chat.updatedAt))}
                          </time>
                        </CardDescription>
                      )}
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${chat.title}`}
                    onClick={() => remove(chat.id)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  </Button>
                </Card>
              ))}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
