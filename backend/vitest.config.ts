import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup/load-test-env.ts"],
    include: ["test/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
    },
  },
});
