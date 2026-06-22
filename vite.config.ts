import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    entries: ["index.html"],
    include: ["react", "react-dom", "react-router-dom", "lucide-react"]
  }
});
