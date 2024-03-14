import { isAbsolute, resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  base: "./",
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "BuildX",
      formats: ["es"],
      fileName: "lib-buildx",
    },
    rollupOptions: {
      external: (id: string) => !id.startsWith(".") && !isAbsolute(id),
      output: {
        preserveModules: true,
      },
    },
  },
  plugins: [dts({ rollupTypes: true })],
  resolve: {
    alias: [
      { find: "@", replacement: resolve(__dirname, "src") },
      { find: "@@", replacement: resolve(__dirname) },
    ],
  },
});
