import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single self-contained dist/index.html (no CDN, opens from disk). Built with data/private present = real names inside; dist/ is gitignored.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
