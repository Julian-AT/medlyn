"use client";

import { ArrowRight02Icon, Mic01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSituationVoice } from "@/hooks/use-situation-voice";
import { SituationPalette } from "./situation-palette";

type Props = {
  activeChip: string | null;
  recent: string[];
  onRun: (text: string, chipId?: string) => void;
};

export function SituationInput({ activeChip, recent, onRun }: Props) {
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
      <Card className="rounded-none bg-transparent py-0 shadow-none ring-0">
        <CardContent className="flex flex-col gap-4 px-0">
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
          <ToggleGroup
            type="single"
            value={activeChip ?? ""}
            onValueChange={(id) => {
              const chip = CHIPS.find((chip) => chip.id === id);
              if (chip) submit(chip.text, chip.id);
            }}
            variant="outline"
            className="flex flex-wrap justify-start gap-2"
            aria-label="Clinical situations"
          >
            {CHIPS.map((chip) => (
              <ToggleGroupItem key={chip.id} value={chip.id} className="rounded-full px-3 text-xs">
                {chip.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>
      <SituationPalette open={open} setOpen={setOpen} recent={recent} submit={submit} />
    </>
  );
}
