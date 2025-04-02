// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals"; // Recommended for specifying environments
import tseslint from 'typescript-eslint'; // Recommended for TS config in flat config

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  // Resolve plugins relative to the config file
  resolvePluginsRelativeTo: __dirname,
});

const eslintConfig = [
  // Base configurations extended using FlatCompat
  ...compat.extends("next/core-web-vitals"),
  // Note: compat.extends("next/typescript") might already include TS parser/plugin setup.
  // However, explicitly adding the TS config object is clearer in flat config.

  // --- ADDED: Explicit Configuration for TypeScript files ---
  {
    // Apply this configuration only to TS/TSX files
    files: ["**/*.ts", "**/*.tsx"],
    // Use the recommended typescript-eslint configuration structure
    languageOptions: {
      parser: tseslint.parser, // Use the TypeScript parser
      parserOptions: {
        project: true, // Assumes tsconfig.json is setup correctly
      },
      globals: { // Define global environments
          ...globals.browser,
          ...globals.node,
          ...globals.es2021,
      },
    },
    plugins: {
      // Define the TypeScript ESLint plugin
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Inherit recommended rules (optional but good practice)
      // ...tseslint.configs.recommended.rules, // Or recommended-type-checked

      // --- ADDED/MODIFIED: Configure no-unused-vars ---
      '@typescript-eslint/no-unused-vars': [
        'error', // Or 'warn' if you prefer warnings
        {
          args: 'all', // Check all arguments
          argsIgnorePattern: '^_', // Ignore arguments starting with _
          varsIgnorePattern: '^_', // Ignore variables starting with _
          caughtErrors: 'all', // Check caught errors
          caughtErrorsIgnorePattern: '^_', // Ignore caught errors starting with _
          ignoreRestSiblings: true // Allow unused rest siblings ({ ...rest })
        },
      ],
      // --- END Configure no-unused-vars ---

      // Add any other specific rule overrides here
      // e.g., '@typescript-eslint/no-explicit-any': 'warn', // Example: Warn instead of error for 'any'
    },
  },
  // --- END ADDED Configuration ---
];

export default eslintConfig;

