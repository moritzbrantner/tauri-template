import { useEffect, useState } from "react";
import type { ThemeMode } from "@moritzbrantner/ui";

function readInitialTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readInitialTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  return { setThemeMode, themeMode };
}

