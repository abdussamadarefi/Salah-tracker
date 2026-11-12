// ESLint flat config. The core purity rule (AGENT-ORDERS rule 2):
// packages/core must not import react, react-native or expo-*.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["packages/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react/*", "react-native", "react-native/*", "expo-*"] },
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["packages/mobile/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "packages/mobile/.expo/**"],
  },
);
