import * as vscode from 'vscode';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as dedent from 'dedent';
import { toggleJsonToJs } from '../../commands/toggleJsonToJs';
import { getConfig, USE_DOUBLE_QUOTES_FOR_JS_STRINGS } from '../../configuration';
import { openEditorWithContentAndHighlightSelection, openEditorWithContentAndSelectAll, openEditorWithContentAndSetCursor } from '../utils/test-utils';
import { EXTENSION_NAME } from '../../commands';
import _ = require('lodash');

const expect = chai.expect;
chai.use(chaiAsPromised);


/**
 * NOTE: Be sure to run these tests with --disable-extensions flag
 */

describe('toggleJsonToJs cycles between strict JSON and "pretty" Javascript object syntax', () => {
    const usageError = 'Must select a single valid JSON or Javascript object! Javascript objects may not contain expressions.';

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    it('basic usage -- starting with JSON', async () => {
        const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
            {
                // comments ok
                "doubleQuotes": "it's not that hard", "singleQuotes": "actually pretty \"easy\"",
                "key-needs-quotes": "blah",
                /* block comments too */
                "trailingComma": {
                    "alsoIn": ["arrays"]
                }
            }
        `);
        await toggleJsonToJs(editor);
        expect(editor.document.getText(editor.selection)).to.equal(dedent`
            {
                doubleQuotes: 'it\'s not that hard',
                singleQuotes: 'actually pretty "easy"',
                'key-needs-quotes': 'blah',
                trailingComma: {
                    alsoIn: [
                        'arrays'
                    ]
                }
            }
        `);
        await toggleJsonToJs(editor);
        expect(editor.document.getText(editor.selection)).to.equal(dedent`
            {
                "doubleQuotes": "it's not that hard",
                "singleQuotes": "actually pretty \"easy\"",
                "key-needs-quotes": "blah",
                "trailingComma": {
                    "alsoIn": [
                        "arrays"
                    ]
                }
            }
        `);
    });

    it('basic usage -- starting with javascript', async () => {
        const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
            {
                // comments ok
                /* block comments too */
                doubleQuotes: "it's not that hard",
                singleQuotes: 'actually pretty "easy"',
                "key-needs-quotes": 'blah',
                leadingDecimalPoint: .8675309, andTrailing: 8675309.,
                positiveSign: +1,
                "backwardsCompatible": "with JSON",
                trailingComma: { alsoIn: ['arrays',] },
            }
        `);
        await toggleJsonToJs(editor);
        expect(editor.document.getText(editor.selection)).to.equal(dedent`
            {
                "doubleQuotes": "it's not that hard",
                "singleQuotes": "actually pretty \"easy\"",
                "key-needs-quotes": "blah",
                "leadingDecimalPoint": 0.8675309,
                "andTrailing": 8675309,
                "positiveSign": 1,
                "backwardsCompatible": "with JSON",
                "trailingComma": {
                    "alsoIn": [
                        "arrays"
                    ]
                }
            }
        `);
        await toggleJsonToJs(editor);
        expect(editor.document.getText(editor.selection)).to.equal(dedent`
            {
                doubleQuotes: 'it\'s not that hard',
                singleQuotes: 'actually pretty "easy"',
                'key-needs-quotes': 'blah',
                leadingDecimalPoint: 0.8675309,
                andTrailing: 8675309,
                positiveSign: 1,
                backwardsCompatible: 'with JSON',
                trailingComma: {
                    alsoIn: [
                        'arrays'
                    ]
                }
            }
        `);
    });

    it('single-line input yields single-line output', async () => {
        const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
            {"first":1,"second":[2,"two"]}
        `);
        await toggleJsonToJs(editor);
        expect(editor.document.getText(editor.selection)).to.equal(dedent`
            { first: 1, second: [2, 'two'] }
        `);
        await toggleJsonToJs(editor);
        expect(editor.document.getText(editor.selection)).to.equal(dedent`
            {"first":1,"second":[2,"two"]}
        `);
    });

    it('error when no text selected', async () => {
        const editor = await openEditorWithContentAndSetCursor(
            'javascript',
            `const obj = { needs: 'highlight' }`,
            'const obj = { needs'.length
        );
        await expect(toggleJsonToJs(editor)).to.be.rejectedWith(usageError);
    });

    it('error when selected text is not a JSON/Javascript object', async () => {
        const editor = await openEditorWithContentAndHighlightSelection(
            'typescript',
            `const arr = [1, 2, 3]`,
            `const arr = `.length,
            `const arr = [1, 2, 3]`.length
        );
        await expect(toggleJsonToJs(editor)).to.be.rejectedWith(usageError);
    });

    it('error when selected text contains an expression', async () => {
        const editor = await openEditorWithContentAndHighlightSelection(
            'typescript',
            `const obj = { sum: 4 + 5 }`,
            `const obj = `.length,
            `const obj = { sum: 4 + 5 }`.length
        );
        await expect(toggleJsonToJs(editor)).to.be.rejectedWith(usageError);
    });

    describe('using double quotes for output', async () => {
        let useDoubleQuotesConfig: boolean;

        before(async () => {
            useDoubleQuotesConfig = getConfig(USE_DOUBLE_QUOTES_FOR_JS_STRINGS);
        });

        after(async () => {
            await vscode.workspace.getConfiguration(EXTENSION_NAME).update(USE_DOUBLE_QUOTES_FOR_JS_STRINGS, useDoubleQuotesConfig);
        });

        it('basic usage', async () => {
            await vscode.workspace.getConfiguration(EXTENSION_NAME).update(USE_DOUBLE_QUOTES_FOR_JS_STRINGS, true);
            const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
                {
                    key: 'some value',
                    'needs-quoting': 'other value'
                }
            `);
            await toggleJsonToJs(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                {
                    "key": "some value",
                    "needs-quoting": "other value"
                }
            `);
            await toggleJsonToJs(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                {
                    key: "some value",
                    "needs-quoting": "other value"
                }
            `);
        });
    });
});
