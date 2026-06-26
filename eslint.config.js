import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Raw HTML elements that feature code must not use directly — compose from the
// SUI design system (@/components/sui) instead, or add a primitive first.
const BANNED_HTML = ['button', 'input', 'textarea', 'select', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];
const noRawHtml = BANNED_HTML.map((el) => ({
  selector: `JSXOpeningElement[name.name='${el}']`,
  message: `Use a SUI primitive from "@/components/sui" instead of a raw <${el}> in feature code (add the primitive first if one doesn't exist).`,
}));

export default defineConfig([
  globalIgnores(['dist', 'dist-lib']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Feature layer: the scheduler must compose from SUI primitives, not raw HTML.
    files: ['src/components/Scheduler/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...noRawHtml],
    },
  },
])
