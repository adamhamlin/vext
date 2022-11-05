/**@type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    ignorePatterns: ['**/*.js'],
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
        'import',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
    ],
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
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
        'import/no-named-as-default-member': 'off',
        'import/no-unresolved': ['error', { ignore: ['^vscode$'] }],
        'import/order': [
            'error',
            {
            groups: [
                'builtin', // Built-in imports (come from NodeJS native) go first
                'external', // <- External imports
                'internal', // <- Absolute imports
                ['sibling', 'parent'], // <- Relative imports, the sibling and parent types they can be mingled together
                'index', // <- index imports
                'unknown', // <- unknown
            ],
            'newlines-between': 'always',
            alphabetize: {
                order: 'asc',
                caseInsensitive: true,
            },
            },
        ],
        'semi': ['error', 'always'],
        'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    }
};