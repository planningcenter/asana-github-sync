const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      // Coding Standards Enforcement
      '@typescript-eslint/no-explicit-any': 'error', // No any types
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'never' // No type casting (as X)
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports', // Use import type for type-only imports
        fixStyle: 'separate-type-imports'
      }],
      // Additional best practices
      '@typescript-eslint/explicit-function-return-type': 'off', // Allow type inference
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off' // GitHub Actions uses console for logging
    }
  },
  {
    files: ['__tests__/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      // Coding Standards Enforcement (same as src, but allow some flexibility in tests)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'never'
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];