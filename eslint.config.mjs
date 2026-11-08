import js from '@eslint/js';
import globals from 'globals';

// Strategy JavaScript is linted explicitly; the existing TS/TSX app is checked
// separately by TypeScript until a repo-wide TS lint baseline is established.
export default [
  { ignores: ['.next/**','node_modules/**','test-results/**'] },
  { files: ['lib/strategy/**/*.mjs','lib/indicators/**/*.mjs','test/chart-*.test.js'],
    ...js.configs.recommended,
    languageOptions: {globals: {...globals.node, ...globals.browser}},
  },
];
