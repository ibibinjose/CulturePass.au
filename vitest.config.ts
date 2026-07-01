import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "amplify/**",
      "scripts/**",
      "android/**",
      "ios/**",
    ],
  },
  // The app relies on the automatic JSX runtime (no `import React` in source);
  // esbuild defaults to the classic runtime, so opt into automatic to match.
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      // React Native ships Flow-typed source that jsdom/esbuild can't parse.
      // react-native-web is plain transpiled JS with the same public API, so we
      // resolve `react-native` to it for modules inside vite's transform graph.
      // Externalized CJS deps are handled by the Module._resolveFilename patch
      // in vitest.setup.ts.
      "react-native": "react-native-web",
      "@": path.resolve(__dirname, "."),
    },
  },
});
