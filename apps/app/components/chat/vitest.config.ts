import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../../", import.meta.url));

// biome-ignore lint/style/noDefaultExport: Vitest discovers its configuration through the default export.
export default {
  root: appRoot,
  resolve: { alias: { "@": appRoot } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["components/chat/**/*.test.mjs", "app/api/chat/**/*.test.mjs"],
  },
};
