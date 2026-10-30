"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

export type NavTheme = "light" | "dark";

type NavState = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  bgTheme: NavTheme;
  setBgTheme: (theme: NavTheme) => void;
};

const NavContext = createContext<NavState>({
  collapsed: false,
  setCollapsed: () => {},
  bgTheme: "light",
  setBgTheme: () => {},
});

export function NavProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [bgTheme, setBgTheme] = useState<NavTheme>("light");

  return (
    <NavContext value={{ collapsed, setCollapsed, bgTheme, setBgTheme }}>{children}</NavContext>
  );
}

export function useNav() {
  return useContext(NavContext);
}
