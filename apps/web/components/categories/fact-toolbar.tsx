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
    <CardContent className="flex flex-wrap items-center gap-3">
      <InputGroup className="h-9 min-w-48 flex-1 rounded-lg sm:max-w-sm">
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={1.75} aria-hidden="true" />
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
        variant="outline"
        size="sm"
        spacing={1}
        aria-label="Filter documented facts"
      >
        <ToggleGroupItem value="all" className="rounded-lg">
          All entries
        </ToggleGroupItem>
        <ToggleGroupItem value="planned" className="rounded-lg">
          Planned
        </ToggleGroupItem>
        <ToggleGroupItem value="negated" className="rounded-lg">
          Negated
        </ToggleGroupItem>
      </ToggleGroup>
    </CardContent>
  );
}
