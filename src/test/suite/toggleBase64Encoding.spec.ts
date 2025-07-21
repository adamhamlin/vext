import { expect } from 'chai';
import dedent from 'dedent';
import _ from 'radashi';
import vscode from 'vscode';

import { toggleBase64Encoding } from '../../commands/toggleBase64Encoding';
import {
    openEditorWithContent,
    openEditorWithContentAndSelectAll,
    openEditorWithContentAndSetCursor,
} from '../utils/test-utils';

describe('toggleBase64Encoding cycles the base 64 encoding of a selection or word', () => {
    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    describe('of a selection', () => {
        it('basic usage', async () => {
            const editor = await openEditorWithContentAndSelectAll('javascript', 'Base 64 encode this string!');
            await toggleBase64Encoding(editor);
            expect(editor.document.getText()).to.equal('QmFzZSA2NCBlbmNvZGUgdGhpcyBzdHJpbmch');
            await toggleBase64Encoding(editor);
            expect(editor.document.getText()).to.equal('Base 64 encode this string!');
        });
    });

    describe('of a word', () => {
        it('basic usage', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                `ignore? encode=me? ignore?`,
                `ignore? enco`.length
            );
            await toggleBase64Encoding(editor);
            expect(editor.document.getText()).to.equal(`ignore? ZW5jb2RlPW1lPw== ignore?`);
            await toggleBase64Encoding(editor);
            expect(editor.document.getText()).to.equal(`ignore? encode=me? ignore?`);
        });

        it('multiple cursors - all selections use casing of first selection', async () => {
            const editor = await openEditorWithContent(
                'javascript',
                dedent`
                four?
                four?
                four?
            `
            );
            for (const _iter of _.list(2)) {
                await vscode.commands.executeCommand('editor.action.insertCursorBelow');
            }
            // All lines should be toggled to the same new quote character
            await toggleBase64Encoding(editor);
            expect(editor.document.getText()).to.equal(dedent`
                Zm91cj8=
                Zm91cj8=
                Zm91cj8=
            `);
            await toggleBase64Encoding(editor);
            expect(editor.document.getText()).to.equal(dedent`
                four?
                four?
                four?
            `);
        });

        it('error when cursor is not inside of word', async () => {
            const editor = await openEditorWithContentAndSetCursor('javascript', 'three   spaces', 'three  '.length);
            await expect(toggleBase64Encoding(editor)).to.be.rejectedWith('Cursor must be located within a word!');
        });
    });
});
