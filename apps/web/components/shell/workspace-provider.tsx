"use client";
import type { Screen } from "@medlyn/engine/contracts";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useReviews } from "@/hooks/use-reviews";

type Workspace = {
  sessionId: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
  setScreen: (screen: Screen | null) => void;
  reviews: ReturnType<typeof useReviews>;
};
const WorkspaceContext = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [screen, setScreen] = useState<Screen | null>(null);
  const reviews = useReviews(screen, sessionId);
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const id = sessionStorage.getItem("medlyn-session") ?? crypto.randomUUID();
    sessionStorage.setItem("medlyn-session", id);
    setSessionId(id);
  }, []);
  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("medlyn-theme", next);
    setTheme(next);
  }
  return (
    <WorkspaceContext.Provider value={{ sessionId, theme, toggleTheme, setScreen, reviews }}>
      <TooltipProvider>
        {children}
        <Toaster theme={theme} />
      </TooltipProvider>
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace provider is required");
  return value;
}
