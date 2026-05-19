import { useEffect, useState } from "react";
import { ThemeMode } from "../types";
import { themeService } from "../services/theme.service";

const THEME_KEY = "spa_theme_mode";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    return "light";
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
      themeService.apply(theme);
    } catch (error) {
      console.error("[theme] persist failed", error);
    }
  }, [theme]);

  return { theme, setTheme };
}

