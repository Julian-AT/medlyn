"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function SourceLanguageToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next)}
      size="sm"
      variant="outline"
      aria-label="Source language"
    >
      <ToggleGroupItem value="de" aria-label="German original" className="min-h-10 min-w-10">
        DE
      </ToggleGroupItem>
      <ToggleGroupItem value="en" aria-label="English translation" className="min-h-10 min-w-10">
        EN
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
