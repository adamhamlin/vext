import { expect } from 'chai';
import dedent from 'dedent';
import _ from 'lodash';
import vscode from 'vscode';

import { EXTENSION_NAME } from '../../commands';
import { toggleCase } from '../../commands/toggleCase';
import { CASE_EXTRA_WORD_CHARS, getConfig } from '../../configuration';
import { openEditorWithContent, openEditorWithContentAndSelectAll, openEditorWithContentAndSetCursor } from '../utils/test-utils';



describe('toggleCase cycles the case of a selection or word', () => {

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    describe('of a selection', () => {
        it('basic usage', async () => {
            const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
                Here is a story all about how
                My life got flipped turned upside-down.
            `);
            await toggleCase(editor);
            expect(editor.document.getText()).to.equal(dedent`
                HERE IS A STORY ALL ABOUT HOW
                MY LIFE GOT FLIPPED TURNED UPSIDE-DOWN.
            `);
            await toggleCase(editor);
            expect(editor.document.getText()).to.equal(dedent`
                here is a story all about how
                my life got flipped turned upside-down.
            `);
            await toggleCase(editor);
            expect(editor.document.getText()).to.equal(dedent`
                HERE IS A STORY ALL ABOUT HOW
                MY LIFE GOT FLIPPED TURNED UPSIDE-DOWN.
            `);
        });
    });

    describe('of a word', () => {
        it('basic usage', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                `const a = "Abc_123 other text";`,
                `const a = "Abc`.length
            );
            await toggleCase(editor);
            expect(editor.document.getText()).to.equal(
                `const a = "ABC_123 other text";`
            );
            await toggleCase(editor);
            expect(editor.document.getText()).to.equal(
                `const a = "abc_123 other text";`
            );
            await toggleCase(editor);
            expect(editor.document.getText()).to.equal(
                `const a = "ABC_123 other text";`
            );
        });

        it('multiple cursors - all selections use casing of first selection', async () => {
            const editor = await openEditorWithContent('javascript', dedent`
                select * from CASE
                SELECT * from CASE
                Select * from CASE
                sELECt * from CASE
            `);
            for (const _iter of _.times(3)) {
                await vscode.commands.executeCommand('editor.action.insertCursorBelow');
            }
            // All lines should be toggled to the same new quote character
            await toggleCase(editor);
            expect(editor.document.getText()).to.equal(dedent`
                SELECT * from CASE
                SELECT * from CASE
                SELECT * from CASE
                SELECT * from CASE
            `);
            await toggleCase(editor);
            expect(editor.document.getText()).to.equal(dedent`
                select * from CASE
                select * from CASE
                select * from CASE
                select * from CASE
            `);
            await toggleCase(editor);
        });

        it('error when cursor is not inside of word', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                'const msg = "Two spaces?  Not gonna work.";',
                'const msg = "Two spaces? '.length
            );
            await expect(toggleCase(editor)).to.be.rejectedWith('Cursor must be located within a word!');
        });

        describe('caseExtraWordChars configuration', async () => {
            let origCaseExtraWordChars: string[];

            before(async () => {
                origCaseExtraWordChars = getConfig(CASE_EXTRA_WORD_CHARS);
            });

            after(async () => {
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(CASE_EXTRA_WORD_CHARS, origCaseExtraWordChars);
            });

            it('configured special characters are not word breaks, others are', async () => {
                const editor = await openEditorWithContentAndSetCursor(
                    'javascript',
                    `const a = "https://www.spring-chicken.com?qty=1000&color=white";`,
                    `const a = "http`.length
                );
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(CASE_EXTRA_WORD_CHARS, [':', '/', '.', '-']);
                await toggleCase(editor);
                expect(editor.document.getText()).to.equal(
                    `const a = "HTTPS://WWW.SPRING-CHICKEN.COM?qty=1000&color=white";`
                );
                await toggleCase(editor);
                expect(editor.document.getText()).to.equal(
                    `const a = "https://www.spring-chicken.com?qty=1000&color=white";`
                );
            });

            it('invalid caseExtraWordChars character', async () => {
                const editor = await openEditorWithContentAndSetCursor(
                    'javascript',
                    'const msg = "this is a simple string";',
                    'const msg = "this '.length
                );
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(CASE_EXTRA_WORD_CHARS, ['__', '^']);
                await expect(toggleCase(editor)).to.be.rejectedWith(`All configured extra word characters must have length 1! The following is invalid: '__'`);
            });
        });
    });
});
