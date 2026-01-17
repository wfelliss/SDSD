// apps/backend/eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  // 1. GLOBAL IGNORES
  {
    ignores: ['dist/**', 'node_modules/**', '.turbo/**'],
  },

  // 2. GLOBAL SETUP (Must be outside the "files" block!)
  // This tells ESLint: "For ALL files, use this folder as the root."
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },

  // 3. BASE CONFIGS
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // 4. TYPESCRIPT SPECIFIC
  {
    files: ['**/*.ts', '**/*.tsx'], 
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.json', // Only look for tsconfig for .ts files
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // 5. DISABLE TYPE-CHECKING FOR JS/CONFIG FILES
  {
    files: ['*.js', '*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  }
);