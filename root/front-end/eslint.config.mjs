import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
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
        Economy: 'readonly',
        getPlatformStats: 'readonly',
        badgeHTML: 'readonly',
        avatarHTML: 'readonly',
        emptyState: 'readonly',
        getGameIconHTML: 'readonly',
        timeAgo: 'readonly',
        formatDate: 'readonly',
        confirmAction: 'readonly'
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "vars": "all", "args": "none" }]
    }
  }
];
