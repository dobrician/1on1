"use client";

import { useEffect } from "react";

interface ThemeColorProviderProps {
  colorTheme: string;
  children: React.ReactNode;
}

export function ThemeColorProvider({
  colorTheme,
  children,
}: ThemeColorProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    if (colorTheme && colorTheme !== "neutral") {
      root.setAttribute("data-color-theme", colorTheme);
    } else {
      root.removeAttribute("data-color-theme");
    }
    return () => {
      root.removeAttribute("data-color-theme");
    };
  }, [colorTheme]);

  return <>{children}</>;
}
