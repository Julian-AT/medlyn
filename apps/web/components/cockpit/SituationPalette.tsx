"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function SituationPalette({
  open,
  setOpen,
  recent,
  submit,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  recent: string[];
  submit: (value: string, chipId?: string) => void;
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Choose a clinical situation"
      description="Open a situation or return to a recent task."
      showCloseButton
    >
      <Command>
        <CommandInput placeholder="Search clinical situations…" />
        <CommandList>
          <CommandEmpty>
            No matching situations. Type your role and task in the situation input.
          </CommandEmpty>
          <CommandGroup heading="Clinical situations">
            {CHIPS.map((chip) => (
              <CommandItem key={chip.id} onSelect={() => submit(chip.text, chip.id)}>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
                {chip.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {recent.length > 0 && (
            <CommandGroup heading="Recent situations">
              {recent.map((value) => (
                <CommandItem key={value} onSelect={() => submit(value)}>
                  {value}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
