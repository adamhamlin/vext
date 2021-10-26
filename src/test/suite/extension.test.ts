import * as vscode from 'vscode';
import * as chai from 'chai';
import * as dedent from 'dedent';
import { toggleCommentType } from '../../commands/toggleCommentType';
import { openEditorWithContent } from '../utils/test-utils';

const expect = chai.expect;

/**
 * NOTE: Be sure to run these tests with --disable-extensions flag
 */

describe('Extension Test Suite', () => {

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    describe('toggleCommentType cycles from line comment, to block, to free text, back to line comment', () => {

        it('javascript', async () => {
            const editor = await openEditorWithContent('javascript', dedent`
                // First line
                // Second line
                // Third line
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                /**
                 * First line
                 * Second line
                 * Third line
                 */
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                // First line
                // Second line
                // Third line
            `);
        });

        it('python', async () => {
            const editor = await openEditorWithContent('python', dedent`
                # First line
                # Second line
                # Third line
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                """
                First line
                Second line
                Third line
                """
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                # First line
                # Second line
                # Third line
            `);
        });

        it('shellscript', async () => {
            // NOTE: No block comment for shellscript
            const editor = await openEditorWithContent('shellscript', dedent`
                # First line
                # Second line
                # Third line
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                # First line
                # Second line
                # Third line
            `);
        });

        it('unspecified language -- assume java-style', async () => {
            const editor = await openEditorWithContent(undefined, dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                // First line
                // Second line
                // Third line
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                /**
                 * First line
                 * Second line
                 * Third line
                 */
            `);
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(dedent`
                First line
                Second line
                Third line
            `);
        });

        it('ruby + indented code', async () => {
            function linesToStr(lines: string[]): string {
                return lines.join('\n');
            }

            const editor = await openEditorWithContent('ruby', linesToStr([
                '    # First line',
                '    # Second line',
                '    # Third line'
            ]));
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(linesToStr([
                '    =begin',
                '    First line',
                '    Second line',
                '    Third line',
                '    =end'
            ]));
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(linesToStr([
                '    First line',
                '    Second line',
                '    Third line'
            ]));
            await toggleCommentType(editor);
            expect(editor.document.getText(editor.selection)).to.equal(linesToStr([
                '    # First line',
                '    # Second line',
                '    # Third line'
            ]));
        });
    });
});
