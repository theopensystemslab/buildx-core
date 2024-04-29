import { pipe } from "fp-ts/lib/function";
import { globSync } from "glob";
import { isAbsolute, resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json";
import { A, O, R } from "./src/utils/functions";

const peerDeps = Object.keys(packageJson.peerDependencies);

// Convert matched paths to an object expected by Rollup input option
const inputEntries = pipe(
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
    case "examples": {
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
              ...inputEntries,
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
    }
    case "library":
    default: {
      return {
        mode: "production",
        base: "./",
        build: {
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "BuildX",
            formats: ["es"],
            fileName: "buildx-core",
          },
          rollupOptions: {
            external: (id: string) =>
              peerDeps.includes(id) ||
              (!id.startsWith("@") && !id.startsWith(".") && !isAbsolute(id)),
            output: {
              preserveModules: true,
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
      };
    }
  }
});
