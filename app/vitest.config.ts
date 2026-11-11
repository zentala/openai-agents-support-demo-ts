import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests are pure logic only: no network, no API key needed.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: { include: ["tests/**/*.test.ts"] },
});
