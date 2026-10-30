"use client";
import type { Screen } from "@medlyn/engine/contracts";
import { sessionForPatient, validReviewSession } from "@medlyn/engine/review/session";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
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
  const { patient } = useActivePatient();
  const [session, setSession] = useState<{ patientId: string; id: string } | null>(null);
  const sessionId = sessionForPatient(session, patient.id);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [screen, setScreen] = useState<Screen | null>(null);
  const reviews = useReviews(
    screen?.patient.id === patient.id ? screen : null,
    sessionId,
    patient.id,
  );
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    let id: string = crypto.randomUUID();
    try {
      const saved = sessionStorage.getItem(`medlyn-session:${patient.id}`);
      if (validReviewSession(saved)) id = saved;
      sessionStorage.setItem(`medlyn-session:${patient.id}`, id);
    } catch {
      console.info("review_session_memory_only");
    }
    setSession({ patientId: patient.id, id });
  }, [patient.id]);
  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    setTheme(next);
    try {
      localStorage.setItem("medlyn-theme", next);
    } catch {
      console.info("theme_preference_memory_only");
    }
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
