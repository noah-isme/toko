module.exports = {
  root: true,
  extends: ['next', 'next/core-web-vitals', 'prettier'],
  plugins: ['import', 'tailwindcss'],
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true }
      }
    ],
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/no-custom-classname': 'off'
  }
};
