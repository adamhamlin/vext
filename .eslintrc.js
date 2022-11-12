module.exports = {
    extends: [
        '@adamhamlin/eslint-config',
    ],
    rules: {
        'import/no-unresolved': ['error', { ignore: ['^vscode$'] }],
    }
};