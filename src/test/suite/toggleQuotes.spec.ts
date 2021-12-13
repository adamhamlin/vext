import * as vscode from 'vscode';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as dedent from 'dedent';
import { toggleQuotes } from '../../commands/toggleQuotes';
import { getConfig, QUOTE_CHARS } from '../../configuration';
import { openEditorWithContent, openEditorWithContentAndSelectAll, openEditorWithContentAndSetCursor } from '../utils/test-utils';
import { EXTENSION_NAME } from '../../commands';
import _ = require('lodash');

const expect = chai.expect;
chai.use(chaiAsPromised);


/**
 * NOTE: Be sure to run these tests with --disable-extensions flag
 */

describe('toggleQuotes cycles the quote characters used in a string', () => {
    const badCursorPositionMsg = 'Cursor must be located within a properly-quoted string! If a backtick string, it cannot contain templating.';

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

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

    it('multiple cursors - all selections use casing of first selection', async () => {
        const editor = await openEditorWithContent('javascript', dedent`
            "string 1",
            'string 2',
            \`string 3\`,
            "string 4"
        `);
        for (const _iter of _.times(3)) {
            await vscode.commands.executeCommand('editor.action.insertCursorBelow');
        }
        // All lines should be toggled to the same new quote character
        await toggleQuotes(editor);
        expect(editor.document.getText()).to.equal(dedent`
            'string 1',
            'string 2',
            'string 3',
            'string 4'
        `);
        await toggleQuotes(editor);
        expect(editor.document.getText()).to.equal(dedent`
            \`string 1\`,
            \`string 2\`,
            \`string 3\`,
            \`string 4\`
        `);
        await toggleQuotes(editor);
        expect(editor.document.getText()).to.equal(dedent`
            "string 1",
            "string 2",
            "string 3",
            "string 4"
        `);
    });

    it('error when cursor is not inside of quoted string', async () => {
        const editor = await openEditorWithContentAndSetCursor(
            'javascript',
            'const msg = "this is a simple string";',
            'const msg'.length
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

    it('error when multi-line selection', async () => {
        const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
            const msg = "this is a simple string";
            const msg2 = "another simple string";
        `);
        await expect(toggleQuotes(editor)).to.be.rejectedWith(
            'Cannot process multi-line selection! However, multi-line cursors are supported.'
        );
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
            expect(editor.document.getText()).to.equal(
                `const truth = % M&Ms are 100\\% tops %;`
            );
            await toggleQuotes(editor);
            expect(editor.document.getText()).to.equal(
                `const truth = & M\\&Ms are 100% tops &;`
            );
        });

        it('invalid alternative quote chars', async () => {
            const invalidQuoteCharMsg = 'All configured quote characters must be strings of length 1 and cannot be special regex characters!';
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
