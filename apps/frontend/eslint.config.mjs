// apps/frontend/eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  // 1. GLOBAL IGNORES
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**', '.react-router/**', '.turbo/**'],
  },

  // 2. GLOBAL SETUP
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
      // ⚠️ FRONTEND SPECIFIC: Enable Browser Globals (window, document)
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
      }
    },
  },

  // 3. BASE RULES
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // 4. TYPESCRIPT FILES ONLY
  {
    files: ['**/*.ts', '**/*.tsx'], // Include .tsx
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.json',
        // ⚠️ FRONTEND SPECIFIC: Enable JSX for React
        ecmaFeatures: {
          jsx: true, 
        },
      },
    },
    rules: {
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // 5. DISABLE TYPE-CHECKING FOR CONFIG FILES
  {
    files: ['eslint.config.mjs', 'vite.config.ts', '**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  }
);