import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: "src/app.ts" },
  outDir: "api",
  bundle: true,
  format: ["cjs"],
  platform: "node",
  sourcemap: true,
  clean: true,
  external: [
    "swagger-ui-express"
  ],
});
