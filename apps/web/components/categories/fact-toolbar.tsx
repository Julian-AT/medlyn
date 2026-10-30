"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FactFilter } from "./fact-filters.ts";

export function FactToolbar({
  query,
  filter,
  onQuery,
  onFilter,
}: {
  query: string;
  filter: FactFilter;
  onQuery: (query: string) => void;
  onFilter: (filter: FactFilter) => void;
}) {
  return (
    <CardContent className="flex flex-wrap items-center gap-3 px-0">
      <InputGroup className="h-10 min-w-48 flex-1 rounded-xl border-0 bg-gray-alpha-100 shadow-none sm:max-w-sm">
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search this record…"
          aria-label="Search documented facts"
        />
      </InputGroup>
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => {
          if (value === "all" || value === "planned" || value === "negated") onFilter(value);
        }}
        variant="default"
        size="sm"
        spacing={1}
        aria-label="Filter documented facts"
      >
        <ToggleGroupItem
          value="all"
          className="rounded-full px-3 text-muted-foreground data-[state=on]:bg-gray-alpha-100 data-[state=on]:text-foreground"
        >
          All entries
        </ToggleGroupItem>
        <ToggleGroupItem
          value="planned"
          className="rounded-full px-3 text-muted-foreground data-[state=on]:bg-gray-alpha-100 data-[state=on]:text-foreground"
        >
          Planned
        </ToggleGroupItem>
        <ToggleGroupItem
          value="negated"
          className="rounded-full px-3 text-muted-foreground data-[state=on]:bg-gray-alpha-100 data-[state=on]:text-foreground"
        >
          Negated
        </ToggleGroupItem>
      </ToggleGroup>
    </CardContent>
  );
}
