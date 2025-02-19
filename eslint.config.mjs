import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import globals from "globals";

/** @type {Array<import('eslint').Linter.FlatConfig>} */
export default [
  {
    files: ["**/*.{js,ts,tsx}"], // Include relevant file types
    ignores: [
      "**/dist/**", // Ignore build output globally
      "**/build/**", // Ignore build artifacts globally
      "**/node_modules/**", // Ignore dependencies
      "**/coverage/**", // Ignore coverage reports globally
      "**/@types/**", // Ignore type definitions globally
      "**/public/**", // Ignore public files
      "**/static/**", // Ignore static assets
      "**/*.d.ts", // Ignore all TypeScript declaration files
      "**/*.min.js", // Ignore minified JavaScript files
      "**/*.bundle.js", // Ignore bundled JavaScript files
      "jest.config.js", // Ignore Jest config file
      "jest.setup.js", // Ignore Jest setup file
      ".eslintrc.*", // Ignore ESLint config files
    ],
    languageOptions: {
      globals: globals.node, // Include Node.js globals
      parser: typescriptParser, // Use TypeScript parser
      parserOptions: {
        ecmaVersion: "latest", // Enable the latest ECMAScript features
        sourceType: "module", // Enable ES modules
        project: "./tsconfig.eslint.json", // Use ESLint-specific TypeScript configuration
        tsconfigRootDir: process.cwd(), // Ensure correct resolution of tsconfig.json
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint, // Enable TypeScript-specific rules
    },
    rules: {
      // General JavaScript rules
      "no-console": ["warn", { allow: ["warn", "error"] }], // Warn on console except for warn/error
      "quotes": ["error", "double", { avoidEscape: true }], // Enforce double quotes
      "semi": ["error", "always"], // Require semicolons
      "indent": ["error", 2, { SwitchCase: 1 }], // Enforce 2-space indentation

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }, // Allow unused variables prefixed with "_"
      ],
      "@typescript-eslint/no-floating-promises": "error", // Enforce proper handling of promises
      "@typescript-eslint/explicit-function-return-type": "warn", // Warn on missing return types
    },
  },
];
