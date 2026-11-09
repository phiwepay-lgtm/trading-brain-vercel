import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['.next/**', 'node_modules/**', 'test-results/**'] },
  { files: ['test/*.test.js'], ...js.configs.recommended, languageOptions: { globals: globals.node } },
];
