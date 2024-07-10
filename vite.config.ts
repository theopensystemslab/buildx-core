import { isAbsolute, resolve } from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";
import dts from "vite-plugin-dts";
import { pipe } from "fp-ts/lib/function";
import { globSync } from "glob";
import { A, O, R } from "./src/utils/functions";
import react from "@vitejs/plugin-react";

const peerDeps = Object.keys(packageJson.peerDependencies);

// const getPackageName = () => packageJson.name;

const fileName = {
  es: `[name].mjs`,
  cjs: `[name].cjs`,
};

const distEntries = {
  index: resolve(__dirname, "src/index.ts"),
  "worker-utils": resolve(__dirname, "src/worker-utils/index.ts"),
  // Add more entry points as needed
};

// Convert matched paths to an object expected by Rollup input option
const examplesInputs = pipe(
  globSync(resolve(__dirname, "examples/**/index.html")),
  A.filterMap((entry) =>
    pipe(
      entry.match(/examples\/(.+)\/index.html$/),
      O.fromNullable,
      O.chain(A.lookup(1)),
      O.map((name): [string, string] => [name, entry])
    )
  ),
  R.fromEntries
);

export default defineConfig(({ mode }) => {
  switch (mode) {
    case "examples":
      return {
        base: "./",
        build: {
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "BuildX",
            formats: ["es"],
            fileName: "buildx-core",
          },
          rollupOptions: {
            output: {
              preserveModules: true,
            },
            input: {
              ...examplesInputs,
            },
          },
        },
        plugins: [
          dts({ rollupTypes: true }),
          react({ include: /\.(mdx|jsx|tsx)$/ }),
        ],
        resolve: {
          alias: [
            { find: "@", replacement: resolve(__dirname, "src") },
            { find: "@@", replacement: resolve(__dirname) },
          ],
        },
        define: {
          "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
        },
      };

    default:
    case "library":
      return {
        base: "./",
        build: {
          lib: {
            entry: distEntries,
            name: "BuildXCore",
            formats: ["es", "cjs"],
            fileName: (format, entryName) =>
              `${fileName[format].replace("[name]", entryName)}`,
          },
          rollupOptions: {
            external: (id) =>
              peerDeps.includes(id) ||
              (!id.startsWith("@") && !id.startsWith(".") && !isAbsolute(id)),
          },
          minify: "terser",
        },
        resolve: {
          alias: [
            { find: "@", replacement: resolve(__dirname, "src") },
            { find: "@@", replacement: resolve(__dirname) },
          ],
        },
        plugins: [
          dts({
            rollupTypes: true,
          }),
        ],
      };
  }
});
