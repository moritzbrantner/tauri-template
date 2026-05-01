import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(
        __dirname,
        "./node_modules/react/jsx-dev-runtime.js",
      ),
      "@moritzbrantner/auth-contract": path.resolve(__dirname, "../platform-packages/packages/auth-contract/src/index.ts"),
      "@moritzbrantner/foundation-contract": path.resolve(__dirname, "../platform-packages/packages/foundation-contract/src/index.ts"),
      "@moritzbrantner/upload-playbook": path.resolve(__dirname, "../platform-packages/packages/upload-playbook/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
  },
});
