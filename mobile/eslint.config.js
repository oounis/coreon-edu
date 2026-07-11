// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // App entièrement en français : les apostrophes dans le JSX sont voulues.
      'react/no-unescaped-entities': 'off',
      // @core est un alias Metro (metro.config.js) qu'ESLint ne connaît pas.
      'import/no-unresolved': ['error', { ignore: ['^@core/'] }],
      // Règles du React Compiler (non utilisé ici) : conseils, pas des erreurs.
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      // Faux positif sur le patron d'icônes (import * as L + L[name]).
      'import/namespace': 'off',
    },
  },
])
