/**@type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    ignorePatterns: ['**/*.js'],
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
        project: '../tsconfig.json',
    },
    rules: {
        'no-return-await': 'off',
        '@typescript-eslint/return-await': ['error', 'in-try-catch'],
        '@typescript-eslint/no-explicit-any': 2,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/no-inferrable-types': 0,
        '@typescript-eslint/no-unused-vars': [
            'error',
            // allow un unused vars if they start with underscore
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            },
        ],
        'semi': [2, 'always'],
        'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    }
};