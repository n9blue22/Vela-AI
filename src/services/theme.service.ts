import { ThemeMode } from "../types";

export const themeService = {
  apply(theme: ThemeMode): void {
    try {
      document.documentElement.setAttribute("data-theme", theme);
    } catch (error) {
      console.error("Failed to apply theme", error);
    }
  }
};

