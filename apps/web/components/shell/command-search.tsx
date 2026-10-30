"use client";

import {
  BubbleChatIcon,
  File02Icon,
  Search01Icon,
  SparklesIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useChatHistory } from "./hooks/use-chat-history";
import { useSearchIndex } from "./hooks/use-search-index";
import { navigation } from "./navigation";

const icon = (glyph: typeof Search01Icon) => (
  <HugeiconsIcon icon={glyph} strokeWidth={2} className="text-muted-foreground" />
);

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { chats } = useChatHistory();
  const { documents, facts } = useSearchIndex(open);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-8 w-56 justify-start gap-2 rounded-[10px] bg-muted px-2.5 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent"
      >
        {icon(Search01Icon)}
        <span className="flex-1 text-left">Search</span>
        <Kbd>⌘K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search Medlyn">
        <Command>
          <CommandInput placeholder="Search pages, chats, documents and facts…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Pages">
              {navigation
                .flatMap((group) => group.items)
                .map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`page ${item.title}`}
                    onSelect={() => go(item.href)}
                  >
                    {icon(item.icon)}
                    {item.title}
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandGroup heading="Situations">
              {CHIPS.map((chip) => (
                <CommandItem
                  key={chip.id}
                  value={`situation ${chip.label} ${chip.text}`}
                  onSelect={() => go(`/situations?chip=${chip.id}`)}
                >
                  {icon(Task01Icon)}
                  {chip.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {chats.length > 0 && (
              <CommandGroup heading="Chats">
                {chats.slice(0, 20).map((chat) => (
                  <CommandItem
                    key={chat.id}
                    value={`chat ${chat.id} ${chat.title}`}
                    onSelect={() => go(`/chat/${chat.id}`)}
                  >
                    {icon(BubbleChatIcon)}
                    <span className="truncate">{chat.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {documents.length > 0 && (
              <CommandGroup heading="Documents">
                {documents.map((document) => (
                  <CommandItem
                    key={document.id}
                    value={`document ${document.id} ${document.titleEn} ${document.title}`}
                    onSelect={() => go("/patient/documents")}
                  >
                    {icon(File02Icon)}
                    <span className="truncate">{document.titleEn}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {document.docDate}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {facts.length > 0 && (
              <CommandGroup heading="Facts">
                {facts.map((fact) => (
                  <CommandItem
                    key={fact.id}
                    value={`fact ${fact.id} ${fact.labelEn}`}
                    onSelect={() => go(fact.href)}
                  >
                    {icon(SparklesIcon)}
                    <span className="truncate">{fact.labelEn}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
