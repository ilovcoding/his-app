import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    root: "demo/client",
    plugins: [react()],
    build: {
        outDir: "../../dist",
        emptyOutDir: true,
        chunkSizeWarningLimit: 1500,
    },
});
