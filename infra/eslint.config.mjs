import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import awscdk from 'eslint-plugin-awscdk';

export default [
  {
    ignores: [
      'node_modules/**',
      'cdk.out/**',
      'cdk.context.json',
      '**/*.js',
      '**/*.d.ts',
      '**/*.mjs',
      'coverage/**',
    ],
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
    },
  },
];
