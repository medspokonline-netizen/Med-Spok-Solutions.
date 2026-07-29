import { defineConfig } from "vite";
import { resolve } from "path";

// Six separate pages, so each HTML file is its own entry point. Anything in
// public/ is copied through untouched, which keeps the /assets/... paths in the
// markup working exactly as they do when the files are opened from disk.
export default defineConfig({
  appType: "mpa",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        products: resolve(__dirname, "products.html"),
        rentOrBuy: resolve(__dirname, "rent-or-buy.html"),
        services: resolve(__dirname, "services.html"),
        about: resolve(__dirname, "about.html"),
        contact: resolve(__dirname, "contact.html"),
      },
    },
  },
});
