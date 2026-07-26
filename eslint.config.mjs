import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettierConfig from 'eslint-config-prettier';
import tailwindcss from 'eslint-plugin-tailwindcss';

const eslintConfig = [
  {
    name: 'toko/ignores',
    ignores: [
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      // Generated from openapi.yaml by `pnpm api:generate`.
      'src/lib/api/generated/schema.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  {
    name: 'toko/typescript',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  {
    name: 'toko/rules',
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    plugins: {
      tailwindcss,
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
