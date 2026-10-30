"use client";

import { useEffect, useState } from "react";

export function useSidebarGroup(id: string, defaultOpen: boolean) {
  const key = `medlyn:sidebar:${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) setOpen(saved === "true");
    } catch (error) {
      console.warn(
        "sidebar_preference_unavailable",
        error instanceof Error ? error.name : "Unknown",
      );
    }
  }, [key]);

  function changeOpen(value: boolean) {
    setOpen(value);
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      console.warn("sidebar_preference_unsaved", error instanceof Error ? error.name : "Unknown");
    }
  }

  return { open, onOpenChange: changeOpen };
}
