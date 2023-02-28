import { expect } from 'chai';
import dedent from 'dedent';
import _ from 'lodash';
import vscode from 'vscode';

import { toggleQuotes } from '../../commands/toggleQuotes';
import { getConfig } from '../../configuration';
import { QUOTE_CHARS } from '../../configuration/configuration.constants';
import { EXTENSION_NAME } from '../../constants';
import {
    openEditorWithContent,
    openEditorWithContentAndHighlightSelection,
    openEditorWithContentAndSelectAll,
    openEditorWithContentAndSetCursor,
} from '../utils/test-utils';

/**
 * NOTE: Be sure to run these tests with --disable-extensions flag
 */

describe('toggleQuotes cycles the quote characters used in a string or selection', () => {
    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    describe('cursor-only -- no highlighted selections', () => {
        const badCursorPositionMsg =
            'Cursor must be located within a properly-quoted string or unquoted word! If a backtick string, it cannot contain templating.';

        it('basic usage', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                `const sql = "select \\"someCol\\" from \\"myDb\\".\\"myTable\\" where bleep != 'bloop'";`,
                'const sql = "sel'.length
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(
                `const sql = 'select "someCol" from "myDb"."myTable" where bleep != \\'bloop\\'';`
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(
                `const sql = \`select "someCol" from "myDb"."myTable" where bleep != 'bloop'\`;`
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(
                `const sql = "select \\"someCol\\" from \\"myDb\\".\\"myTable\\" where bleep != 'bloop'";`
            );
        });

        it('quotes inside backtick string template', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                'const msg = `The quick, brown ${animal} jumps ${preposition + "the lazy"} dog`;',
                'const msg = `The quick, brown ${animal} jumps ${preposition + "the'.length
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(
                // prettier-ignore
                'const msg = `The quick, brown ${animal} jumps ${preposition + \'the lazy\'} dog`;'
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(
                'const msg = `The quick, brown ${animal} jumps ${preposition + `the lazy`} dog`;'
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(
                'const msg = `The quick, brown ${animal} jumps ${preposition + "the lazy"} dog`;'
            );
        });

        it('words outside of a quoted string can have quotes toggled on; quoted words can have quotes toggled off', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                `// Something I want to use quotes on...`,
                '// Something I want to use qu'.length
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`// Something I want to use "quotes" on...`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`// Something I want to use 'quotes' on...`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`// Something I want to use \`quotes\` on...`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`// Something I want to use quotes on...`);
        });

        it('correct behavior when cursor is at end of word', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                `// Something I want to use quotes on...`,
                '// Something I want to use quotes'.length
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`// Something I want to use "quotes" on...`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`// Something I want to use 'quotes' on...`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`// Something I want to use \`quotes\` on...`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`// Something I want to use quotes on...`);
        });

        it('multiple cursors - all selections use quote character from first selection', async () => {
            const editor = await openEditorWithContent(
                'javascript',
                dedent`
                "string1"
                'string 2'
                \`string 3\`
                "string 4"
            `
            );
            for (const _iter of _.times(3)) {
                await vscode.commands.executeCommand('editor.action.insertCursorBelow');
            }
            // All lines should be toggled to the same new quote character
            // NOTE: Even tho the first entry is considered a "word", since all selections are not
            // words quotes cannot be toggled off
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(dedent`
                'string1'
                'string 2'
                'string 3'
                'string 4'
            `);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(dedent`
                \`string1\`
                \`string 2\`
                \`string 3\`
                \`string 4\`
            `);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(dedent`
                "string1"
                "string 2"
                "string 3"
                "string 4"
            `);
        });

        it('multiple cursors - toggling quotes off allowed when all strings are considered words', async () => {
            const editor = await openEditorWithContent(
                'javascript',
                dedent`
                "string1"
                'string2'
                \`string3\`
            `
            );
            for (const _iter of _.times(4)) {
                await vscode.commands.executeCommand('editor.action.insertCursorBelow');
            }
            // All lines should be toggled to the same new quote character
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(dedent`
                'string1'
                'string2'
                'string3'
            `);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(dedent`
                \`string1\`
                \`string2\`
                \`string3\`
            `);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(dedent`
                string1
                string2
                string3
            `);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(dedent`
                "string1"
                "string2"
                "string3"
            `);
        });

        it('error when cursor is not inside of quoted string or unquoted word', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                'const msg = "this is a simple string";',
                'const msg ='.length
            );
            await expect(toggleQuotes(editor)).to.be.rejectedWith(badCursorPositionMsg);
        });

        it('error when cursor inside of backtick string that uses templating', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                'const msg = `The quick, brown ${animal} jumps ${preposition + "the lazy"} dog`;',
                'const msg = `The quick,'.length
            );
            await expect(toggleQuotes(editor)).to.be.rejectedWith(badCursorPositionMsg);
        });

        describe('alternative quote chars', async () => {
            let quoteCharsConfig: string[];

            before(async () => {
                quoteCharsConfig = getConfig(QUOTE_CHARS);
            });

            after(async () => {
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(QUOTE_CHARS, quoteCharsConfig);
            });

            it('basic usage', async () => {
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(QUOTE_CHARS, ['%', '&']);
                const editor = await openEditorWithContentAndSetCursor(
                    'javascript',
                    'const truth = & M\\&Ms are 100% tops &;',
                    'const truth = & M\\&Ms'.length
                );
                await toggleQuotes(editor);
                expect(editor.document.getText()).to.equal(`const truth = % M&Ms are 100\\% tops %;`);
                await toggleQuotes(editor);
                expect(editor.document.getText()).to.equal(`const truth = & M\\&Ms are 100% tops &;`);
            });

            it('invalid alternative quote chars', async () => {
                const invalidQuoteCharMsg =
                    'All configured quote characters must be strings of length 1 and cannot be special regex characters!';
                const editor = await openEditorWithContentAndSetCursor(
                    'javascript',
                    'const msg = "this is a simple string";',
                    'const msg = "this '.length
                );
                // Can't use regex special char
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(QUOTE_CHARS, ['"', '^']);
                await expect(toggleQuotes(editor)).to.be.rejectedWith(invalidQuoteCharMsg);
                // Can't use multi-character quote
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(QUOTE_CHARS, ['"', '"""']);
                await expect(toggleQuotes(editor)).to.be.rejectedWith(invalidQuoteCharMsg);
            });
        });
    });

    describe('highlighted selections', () => {
        it('basic usage', async () => {
            const editor = await openEditorWithContentAndHighlightSelection(
                'typescript',
                `{ 'key': 'some value' }`,
                `{ `.length,
                `{ 'key'`.length
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`{ \`key\`: 'some value' }`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`{ key: 'some value' }`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`{ "key": 'some value' }`);
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(`{ 'key': 'some value' }`);
        });

        it('multiline selection', async () => {
            const editor = await openEditorWithContentAndSelectAll(
                'typescript',
                dedent`
                It's gonna be a bright, bright
                "sunshine-y" day.
            `
            );
            await toggleQuotes(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                "It's gonna be a bright, bright
                \"sunshine-y\" day."
            `);
            await toggleQuotes(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                'It\'s gonna be a bright, bright
                "sunshine-y" day.'
            `);
            await toggleQuotes(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                \`It's gonna be a bright, bright
                "sunshine-y" day.\`
            `);
            await toggleQuotes(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                It's gonna be a bright, bright
                "sunshine-y" day.
            `);
        });
    });
});
