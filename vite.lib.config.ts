import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";

// Library build (npm publish). The app build stays in vite.config.ts.
// Run with: pnpm build:lib  /  npm run build:lib
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({ include: ["src"], rollupTypes: true, tsconfigPath: "./tsconfig.app.json" }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist-lib",
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "SkedulerUI",
      formats: ["es"],
      fileName: () => "skeduler-ui.js",
    },
    rollupOptions: {
      // Don't bundle the consumer's React (or peer libraries) into the package.
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "radix-ui",
        "lucide-react",
        "react-day-picker",
        "sonner",
        "@tanstack/react-virtual",
      ],
    },
  },
});
