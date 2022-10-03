import * as vscode from 'vscode';
import * as _ from 'lodash';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as dedent from 'dedent';
import { toggleCommentType } from '../../commands/toggleCommentType';
import { AUTO_FORMAT_ON_COMMENT_TOGGLE, getConfig } from '../../configuration';
import { openEditorWithContentAndSelectAll } from '../utils/test-utils';
import { EXTENSION_NAME } from '../../commands';

const expect = chai.expect;
chai.use(chaiAsPromised);

const testModes = {
    HIGHLIGHTED_SELECTION: 'highlighted selection',
    CURSOR_FIRST_LINE: 'cursor first line',
    CURSOR_LAST_LINE: 'cursor last line',
    CURSOR_MIDDLE_LINE: 'cursor middle line',
};

/**
 * NOTE: Be sure to run these tests with --disable-extensions flag
 */

_.forEach(testModes, (mode) => {
    const errorMsg = 'Could not parse a valid comment encompassing the current line.';

    describe(`toggleCommentType cycles from line comment, to block, to free text, back to line comment -- ${mode}`, () => {

        afterEach(async () => {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        });

        async function toggleCommentTypeAndValidateText(editor: vscode.TextEditor, expectedText: string) {
            const selection = chooseSelection(editor);
            editor.selections = [selection];
            await toggleCommentType(editor);
            expect(editor.document.getText()).to.equal(expectedText);
        }

        function chooseSelection(editor: vscode.TextEditor): vscode.Selection {
            const currentSelection = editor.selection;
            if (mode === testModes.HIGHLIGHTED_SELECTION) {
                return currentSelection;
            } else {
                // Remove highlighting and place cursor as applicable
                let newCursorPosition: vscode.Position;
                switch (mode) {
                    case testModes.CURSOR_FIRST_LINE:
                        newCursorPosition = currentSelection.start;
                        break;
                    case testModes.CURSOR_LAST_LINE:
                        newCursorPosition = currentSelection.end;
                        break;
                    case testModes.CURSOR_MIDDLE_LINE: {
                        const newLineNumber = Math.floor((currentSelection.end.line - currentSelection.start.line) / 2);
                        newCursorPosition = new vscode.Position(newLineNumber, 0);
                        break;
                    }
                    default:
                        throw new Error('Unhandled test mode');
                }
                return new vscode.Selection(newCursorPosition, newCursorPosition);
            }
        }

        it('javascript', async () => {
            const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
                // First line
                // Second line
                // Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                /**
                 * First line
                 * Second line
                 * Third line
                 */
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                // First line
                // Second line
                // Third line
            `);
        });

        it('python', async () => {
            const editor = await openEditorWithContentAndSelectAll('python', dedent`
                # First line
                # Second line
                # Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                """
                First line
                Second line
                Third line
                """
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                # First line
                # Second line
                # Third line
            `);
        });

        it('shellscript', async () => {
            // NOTE: No block comment for shellscript
            const editor = await openEditorWithContentAndSelectAll('shellscript', dedent`
                # First line
                # Second line
                # Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                # First line
                # Second line
                # Third line
            `);
        });

        it('unspecified language -- assume java-style', async () => {
            const editor = await openEditorWithContentAndSelectAll(undefined, dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                // First line
                // Second line
                // Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                /**
                 * First line
                 * Second line
                 * Third line
                 */
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                First line
                Second line
                Third line
            `);
        });

        it('ruby + indented code', async () => {
            function linesToStr(lines: string[]): string {
                return lines.join('\n');
            }

            const editor = await openEditorWithContentAndSelectAll('ruby', linesToStr([
                '    # First line',
                '    # Second line',
                '    # Third line'
            ]));
            await toggleCommentTypeAndValidateText(editor, linesToStr([
                '    =begin',
                '    First line',
                '    Second line',
                '    Third line',
                '    =end'
            ]));
            await toggleCommentTypeAndValidateText(editor, linesToStr([
                '    First line',
                '    Second line',
                '    Third line'
            ]));
            await toggleCommentTypeAndValidateText(editor, linesToStr([
                '    # First line',
                '    # Second line',
                '    # Third line'
            ]));
        });

        it('non-jsdoc comment still interpreted as block comment', async () => {
            // We'll also test blank lines in middle of text
            const editor = await openEditorWithContentAndSelectAll(undefined, dedent`
                /*First line
                 Second line
                 Third line
                 */
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                First line
                Second line
                Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                // First line
                // Second line
                // Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                /**
                 * First line
                 * Second line
                 * Third line
                 */
            `);
        });

        it('blank lines preserved based on highligted vs cursor', async () => {
            const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
                // First line
                //
                // Second line
                // Third line
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                /**
                 * First line
                 *
                 * Second line
                 * Third line
                 */
            `);
            await toggleCommentTypeAndValidateText(editor, dedent`
                First line

                Second line
                Third line
            `);
            switch (mode) {
                case testModes.HIGHLIGHTED_SELECTION:
                    await toggleCommentTypeAndValidateText(editor, dedent`
                        // First line
                        //
                        // Second line
                        // Third line
                    `);
                    break;
                case testModes.CURSOR_FIRST_LINE:
                case testModes.CURSOR_MIDDLE_LINE:
                    await toggleCommentTypeAndValidateText(editor, dedent`
                        // First line

                        Second line
                        Third line
                    `);
                    break;
                case testModes.CURSOR_LAST_LINE:
                    await toggleCommentTypeAndValidateText(editor, dedent`
                        First line

                        // Second line
                        // Third line
                    `);
                    break;
            }
        });

        it('error when executing on blank line', async () => {
            const editor = await openEditorWithContentAndSelectAll(undefined, dedent`

            `);
            await expect(toggleCommentType(editor)).to.be.rejectedWith(errorMsg);
        });

        describe('error when attempting to auto-format and Rewrap is not installed', () => {
            let autoFormatConfig: boolean;

            before(async () => {
                autoFormatConfig = getConfig(AUTO_FORMAT_ON_COMMENT_TOGGLE);
            });

            after(async () => {
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(AUTO_FORMAT_ON_COMMENT_TOGGLE, autoFormatConfig);
            });

            it('error when cursor inside of backtick string that uses templating', async () => {
                await vscode.workspace.getConfiguration(EXTENSION_NAME).update(AUTO_FORMAT_ON_COMMENT_TOGGLE, true);
                const editor = await openEditorWithContentAndSelectAll('typescript', dedent`
                    // First line
                    // Second line
                    // Third line
                `);
                await expect(toggleCommentType(editor)).to.be.rejectedWith(
                    `Extension 'rewrap' (stkb.rewrap) is required in order to auto-format comments (see setting autoFormatOnToggleCommentType). Please ensure it has been properly installed/enabled: Extension 'stkb.rewrap' not found!`
                );
            });
        });
    });
});
