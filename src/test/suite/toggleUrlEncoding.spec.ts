import { expect } from 'chai';
import dedent from 'dedent';
import _ from 'radashi';
import vscode from 'vscode';

import { toggleUrlEncoding } from '../../commands/toggleUrlEncoding';
import {
    openEditorWithContent,
    openEditorWithContentAndSelectAll,
    openEditorWithContentAndSetCursor,
} from '../utils/test-utils';

describe('toggleUrlEncoding cycles the URL encoding of a selection or word', () => {
    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    describe('of a selection', () => {
        it('basic usage', async () => {
            const editor = await openEditorWithContentAndSelectAll(
                'javascript',
                'I am 99% sure this is not URL encoded/translated'
            );
            await toggleUrlEncoding(editor);
            expect(editor.document.getText()).to.equal(
                'I%20am%2099%25%20sure%20this%20is%20not%20URL%20encoded%2Ftranslated'
            );
            await toggleUrlEncoding(editor);
            expect(editor.document.getText()).to.equal('I am 99% sure this is not URL encoded/translated');
        });
    });

    describe('of a word', () => {
        it('basic usage', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                `ignore? encode=this? ignore?`,
                `ignore? enco`.length
            );
            await toggleUrlEncoding(editor);
            expect(editor.document.getText()).to.equal(`ignore? encode%3Dthis%3F ignore?`);
            await toggleUrlEncoding(editor);
            expect(editor.document.getText()).to.equal(`ignore? encode=this? ignore?`);
        });

        it('multiple cursors - all selections use casing of first selection', async () => {
            const editor = await openEditorWithContent(
                'javascript',
                dedent`
                encode?
                encode?
                encode?
            `
            );
            for (const _iter of _.list(2)) {
                await vscode.commands.executeCommand('editor.action.insertCursorBelow');
            }
            // All lines should be toggled to the same new quote character
            await toggleUrlEncoding(editor);
            expect(editor.document.getText()).to.equal(dedent`
                encode%3F
                encode%3F
                encode%3F
            `);
            await toggleUrlEncoding(editor);
            expect(editor.document.getText()).to.equal(dedent`
                encode?
                encode?
                encode?
            `);
        });

        it('error when cursor is not inside of word', async () => {
            const editor = await openEditorWithContentAndSetCursor('javascript', 'three   spaces', 'three  '.length);
            await expect(toggleUrlEncoding(editor)).to.be.rejectedWith('Cursor must be located within a word!');
        });
    });
});
