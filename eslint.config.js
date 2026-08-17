// Flat-конфиг ESLint для ESM/browser-проекта (ESLint 9+)
import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'www/**',
            'node_modules/**',
            'android/**',
            'ios/**',
        ],
    },
    js.configs.recommended,
    {
        files: ['js/**/*.js', 'scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
    },
    {
        // Браузерный код (js/*.js) — окно, DOM, storage
        files: ['js/**/*.js'],
        languageOptions: {
            globals: globals.browser,
        },
    },
    {
        // Node-код: тесты и билд-скрипты
        files: ['scripts/**/*.js', 'js/*.test.js'],
        languageOptions: {
            globals: globals.node,
        },
    },
    {
        rules: {
            // Пустые catch-блоки (тихие фолбэки localStorage) — намеренные
            'no-empty': ['error', { allowEmptyCatch: true }],
            // Разрешены неиспользуемые переменные с префиксом _
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],
        },
    },
];
