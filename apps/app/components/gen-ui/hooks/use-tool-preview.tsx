"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function useToolPreview(count: number, expanded = false, previewCount = 3) {
  const [showAll, setShowAll] = useState(false);
  const limit = expanded || showAll ? count : previewCount;
  const toggle =
    !expanded && count > previewCount ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 rounded-control px-2 text-xs"
        aria-expanded={showAll}
        onClick={() => setShowAll((value) => !value)}
      >
        {showAll ? "Show less" : `Show all (${count})`}
      </Button>
    ) : null;
  return { limit, toggle, showAll: expanded || showAll };
}
