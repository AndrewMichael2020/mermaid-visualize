// Minimal ESLint flat config to allow ESLint v9 to parse JS/TS/TSX files
// This focuses on parsing (parser + parserOptions) so we can migrate safely.
module.exports = [
  // Ignore common build/test folders
  {
    ignores: ['node_modules/**', '.next/**', 'coverage/**'],
  },
  // Apply parser for JS/TS files
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      // Register Next.js ESLint plugin so Next-specific rules exist
      '@next/next': require('@next/eslint-plugin-next'),
    },
    rules: {
      // Disable Next-specific rule that isn't wired in this minimal config yet
      '@next/next/no-img-element': 'off',
      // keep default rule set minimal during migration; stricter rules can be added later
    },
  },
];
