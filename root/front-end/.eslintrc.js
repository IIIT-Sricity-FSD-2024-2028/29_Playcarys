module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { 'vars': 'all', 'args': 'after-used', 'ignoreRestSiblings': false }]
  },
  globals: {
    DB: 'readonly',
    Auth: 'readonly',
    UI: 'readonly',
    Toast: 'readonly',
    Modal: 'readonly',
    Validate: 'readonly',
    io: 'readonly',
    buildNavbar: 'readonly',
    injectSideDrawer: 'readonly',
    navigate: 'readonly',
    navigateTo: 'readonly',
    Economy: 'readonly'
  }
};
