// @ts-check
const base = require('./base');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...base,
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
