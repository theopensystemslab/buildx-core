import { isAbsolute, resolve } from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";
import dtsPlugin from "vite-plugin-dts";

const peerDeps = Object.keys(packageJson.peerDependencies);

const getPackageName = () => packageJson.name;

const fileName = {
  es: `[name].mjs`,
  cjs: `[name].cjs`,
};

const entry = {
  index: resolve(__dirname, "src/index.ts"),
  workers: resolve(__dirname, "src/workers/index.ts"),
  // Add more entry points as needed
};

export default defineConfig({
  build: {
    lib: {
      entry,
      name: getPackageName(),
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        fileName[format].replace("[name]", entryName),
    },
    rollupOptions: {
      external: (id) =>
        peerDeps.includes(id) ||
        (!id.startsWith("@") && !id.startsWith(".") && !isAbsolute(id)),
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: resolve(__dirname, "src") },
      { find: "@@", replacement: resolve(__dirname) },
    ],
  },
  plugins: [
    dtsPlugin({
      rollupTypes: true,
    }),
  ],
});
