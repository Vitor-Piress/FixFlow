import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "FixFlow",
        short_name: "FixFlow",
        description:
          "Orçamentos, contratos mensais, catálogo de serviços e controle financeiro em campo.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        // Avoid duplicating root public assets already registered by VitePWA.
        globIgnores: [
          "favicon.svg",
          "apple-touch-icon.png",
          "pwa-*.png",
          "manifest.webmanifest",
        ],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rolldownOptions: {
      // jsPDF lists html2canvas/canvg/dompurify as optional imports for html()/svg();
      // FixFlow only renders captured canvases via html-to-image + addImage().
      external: ["html2canvas", "canvg", "dompurify"],
      output: {
        codeSplitting: {
          groups: [
            {
              debugName: "vendor-chunks",
              name(moduleId) {
                if (
                  moduleId.includes("node_modules/react/") ||
                  moduleId.includes("node_modules/react-dom/") ||
                  moduleId.includes("node_modules/react-router") ||
                  moduleId.includes("node_modules/scheduler/")
                ) {
                  return "react-vendor";
                }
                if (moduleId.includes("node_modules/@supabase/")) {
                  return "supabase-vendor";
                }
                if (moduleId.includes("node_modules/@tanstack/")) {
                  return "query-vendor";
                }
                if (
                  moduleId.includes("node_modules/motion") ||
                  moduleId.includes("node_modules/framer-motion") ||
                  moduleId.includes("node_modules/vaul") ||
                  moduleId.includes("node_modules/sonner") ||
                  moduleId.includes("node_modules/lucide-react")
                ) {
                  return "ui-vendor";
                }
                return null;
              },
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
