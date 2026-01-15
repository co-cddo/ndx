import js from "@eslint/js"
import tseslint from "typescript-eslint"
import awscdk from "eslint-plugin-awscdk"

export default [
  {
    ignores: ["node_modules/**", "cdk.out/**", "cdk.context.json", "**/*.js", "**/*.d.ts", "**/*.mjs", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      awscdk,
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...awscdk.configs.recommended.rules,
      // Disabled: Stack suffix is common convention and readable
      "awscdk/no-construct-stack-suffix": "off",
      // Disabled: Public properties exposing constructs needed for stack composition
      "awscdk/no-construct-in-public-property-of-construct": "off",
      // Disabled: Mutable props are acceptable for our use case
      "awscdk/no-mutable-property-of-props-interface": "off",
    },
  },
  // Relaxed rules for test files where mocking requires flexible typing
  {
    files: ["**/*.test.ts", "test/**/*.ts", "test-payload-inline.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "awscdk/no-construct-stack-suffix": "off",
    },
  },
  // Relaxed rules for Lambda handlers that work with dynamic event data
  // TODO: Add proper typing to Lambda event handlers and remove this override
  {
    files: ["lib/lambda/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]
