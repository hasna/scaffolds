import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.config.*", "**/types/**"],
    },
    setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
      "@scaffold-social/types": path.resolve(__dirname, "./packages/types/src"),
      "@scaffold-social/utils": path.resolve(__dirname, "./packages/utils/src"),
      "@scaffold-social/database": path.resolve(__dirname, "./packages/database/src"),
    },
  },
});
