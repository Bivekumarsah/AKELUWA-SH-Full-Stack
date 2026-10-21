import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".tmp-review/**",
    "next-env.d.ts",
    // Standalone browser snapshot, including upstream minified PDF engines.
    "toolbox/**",
    "public/akeluwatoolbox/**",
    ".sites-runtime/**",
    ".wrangler/**",
    ".vinext/**",
  ]),
]);

export default eslintConfig;
