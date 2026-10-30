"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Mic01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import type { Situation } from "@medlyn/engine/contracts";
import { useSituationVoice } from "@/hooks/use-situation-voice";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SituationPalette } from "@/components/cockpit/SituationPalette";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type Props = {
  situation?: Situation;
  recent: string[];
  onRun: (text: string, chipId?: string) => void;
};

export function SiteHeader({ situation, recent, onRun }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  function submit(value: string, chipId?: string) {
    if (!value.trim()) return;
    setText(chipId ? "" : value);
    setOpen(false);
    onRun(value, chipId);
  }
  const voice = useSituationVoice(submit);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <>
      <header className="flex shrink-0 flex-col gap-4 border-b p-4 lg:px-6 print:hidden">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <SidebarTrigger aria-label="Toggle patient sidebar" />
            </BreadcrumbItem>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <BreadcrumbItem>Anna Musterfrau</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>{situation?.role ?? "Clinical lens"}</BreadcrumbItem>
            <BreadcrumbSeparator className="hidden lg:block" />
            <BreadcrumbItem className="hidden lg:block">
              <BreadcrumbPage>{situation?.task ?? "Preparing your workspace"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(text);
          }}
        >
          <InputGroup className="h-12">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Who are you and what are you about to do?"
              placeholder="Who are you and what are you about to do?"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <InputGroupAddon align="inline-end">
              {voice.supported && (
                <InputGroupButton
                  size="icon-sm"
                  variant={voice.listening ? "destructive" : "ghost"}
                  aria-label="Hold to speak your situation"
                  aria-pressed={voice.listening}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    voice.start();
                  }}
                  onPointerUp={voice.stop}
                  onPointerCancel={voice.stop}
                  onKeyDown={(event) => {
                    if (["Space", "Enter"].includes(event.code) && !event.repeat) {
                      event.preventDefault();
                      voice.start();
                    }
                  }}
                  onKeyUp={(event) => {
                    if (["Space", "Enter"].includes(event.code)) {
                      event.preventDefault();
                      voice.stop();
                    }
                  }}
                >
                  <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} aria-hidden="true" />
                </InputGroupButton>
              )}
              <InputGroupButton
                aria-label="Choose a clinical situation"
                onClick={() => setOpen(true)}
              >
                <Kbd>⌘ K</Kbd>
              </InputGroupButton>
              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-sm"
                disabled={!text.trim()}
                aria-label="Open clinical lens"
              >
                <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </header>
      <SituationPalette open={open} setOpen={setOpen} recent={recent} submit={submit} />
    </>
  );
}
