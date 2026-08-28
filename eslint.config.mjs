import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettierConfig from 'eslint-config-prettier';
import tailwindcss from 'eslint-plugin-tailwindcss';
import typescript from 'typescript-eslint';

const eslintConfig = [
  {
    name: 'toko/ignores',
    ignores: [
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      // Generated from openapi.yaml by `pnpm api:generate`.
      'src/lib/api/generated/schema.d.ts',
      // Route groups with parentheses cause issues with typescript-eslint
      'src/app/(admin)/settings/**',
    ],
  },
  ...fixupConfigRules(nextCoreWebVitals).map((config) => {
    // Add ignores to all next configs
    return {
      ...config,
      ignores: [...(config.ignores || []), 'src/app/(admin)/settings/**'],
    };
  }),
  {
    name: 'toko/parser',
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    ignores: ['src/app/(admin)/settings/**'],
    languageOptions: {
      parser: typescript.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: false,
        sourceType: 'module',
      },
    },
  },
  {
    name: 'toko/typescript',
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['src/app/(admin)/settings/**'],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
  },
  {
    name: 'toko/rules',
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    ignores: ['src/app/(admin)/settings/**'],
    plugins: {
      tailwindcss: fixupPluginRules(tailwindcss),
    },
    rules: {
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      // The following react-hooks rules are React Compiler adoption checks
      // shipped by eslint-plugin-react-hooks v7. This project does not enable
      // the React Compiler (no babel-plugin-react-compiler / experimental.reactCompiler),
      // so these rules flag correct, intentional code (manual useMemo, react-hook-form).
      // Re-enable them if/when the compiler is turned on.
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },
  prettierConfig,
];

export default eslintConfig;
