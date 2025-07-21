import { expect } from 'chai';
import dedent from 'dedent';
import _ from 'radashi';
import sinon from 'sinon';
import vscode from 'vscode';

import * as dependencyCommand from '../../commands/dependencyCommand';
import { DependencyCommand } from '../../commands/dependencyCommand';
import { toggleCommentType } from '../../commands/toggleCommentType';
import { getConfig } from '../../configuration';
import { AUTO_FORMAT_ON_COMMENT_TOGGLE } from '../../configuration/configuration.constants';
import { EXTENSION_NAME } from '../../constants';
import { openEditorWithContentAndHighlightSelection, openEditorWithContentAndSelectAll } from '../utils/test-utils';

const testModes = {
    HIGHLIGHTED_SELECTION: 'highlighted selection',
    CURSOR_FIRST_LINE: 'cursor first line',
    CURSOR_LAST_LINE: 'cursor last line',
    CURSOR_MIDDLE_LINE: 'cursor middle line',
};

/**
 * NOTE: Be sure to run these tests with --disable-extensions flag
 */

describe('toggleCommentType', () => {
    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        sinon.restore();
    });

    Object.values(testModes).forEach((mode) => {
        describe(`cycles from line comment, to block, to free text, back to line comment -- ${mode}`, () => {
            const errorMsg = 'Could not parse a valid comment encompassing the current line.';

            async function toggleCommentTypeAndValidateText(
                editor: vscode.TextEditor,
                expectedText: string
            ): Promise<void> {
                const selection = await chooseSelection(editor);
                editor.selections = [selection];
                await toggleCommentType(editor);
                expect(editor.document.getText()).to.equal(expectedText);
            }

            async function chooseSelection(editor: vscode.TextEditor): Promise<vscode.Selection> {
                await vscode.commands.executeCommand('editor.action.selectAll');
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
                            const newLineNumber = Math.ceil(
                                (currentSelection.end.line - currentSelection.start.line) / 2
                            );
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
                const editor = await openEditorWithContentAndSelectAll(
                    'javascript',
                    dedent`
                    // First line
                    // Second line
                    // Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    /**
                     * First line
                     * Second line
                     * Third line
                     */
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    First line
                    Second line
                    Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    // First line
                    // Second line
                    // Third line
                `
                );
            });

            it('python', async () => {
                const editor = await openEditorWithContentAndSelectAll(
                    'python',
                    dedent`
                    # First line
                    # Second line
                    # Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    """
                    First line
                    Second line
                    Third line
                    """
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    First line
                    Second line
                    Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    # First line
                    # Second line
                    # Third line
                `
                );
            });

            it('shellscript', async () => {
                // NOTE: No block comment for shellscript
                const editor = await openEditorWithContentAndSelectAll(
                    'shellscript',
                    dedent`
                    # First line
                    # Second line
                    # Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    First line
                    Second line
                    Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    # First line
                    # Second line
                    # Third line
                `
                );
            });

            it('unspecified language -- assume java-style', async () => {
                const editor = await openEditorWithContentAndSelectAll(
                    undefined,
                    dedent`
                    First line
                    Second line
                    Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    // First line
                    // Second line
                    // Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    /**
                     * First line
                     * Second line
                     * Third line
                     */
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    First line
                    Second line
                    Third line
                `
                );
            });

            it('ruby + indented code', async () => {
                function linesToStr(lines: string[]): string {
                    return lines.join('\n');
                }

                // prettier-ignore
                const editor = await openEditorWithContentAndSelectAll('ruby', linesToStr([
                    '    # First line',
                    '    # Second line',
                    '    # Third line'
                ]));
                // prettier-ignore
                await toggleCommentTypeAndValidateText(editor, linesToStr([
                    '    =begin',
                    '    First line',
                    '    Second line',
                    '    Third line',
                    '    =end'
                ]));
                // prettier-ignore
                await toggleCommentTypeAndValidateText(editor, linesToStr([
                    '    First line',
                    '    Second line',
                    '    Third line'
                ]));
                // prettier-ignore
                await toggleCommentTypeAndValidateText(editor, linesToStr([
                    '    # First line',
                    '    # Second line',
                    '    # Third line'
                ]));
            });

            it('non-jsdoc comment still interpreted as block comment', async () => {
                // We'll also test blank lines in middle of text
                const editor = await openEditorWithContentAndSelectAll(
                    undefined,
                    dedent`
                    /*First line
                    Second line
                    Third line
                    */
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    First line
                    Second line
                    Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    // First line
                    // Second line
                    // Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    /**
                     * First line
                     * Second line
                     * Third line
                     */
                `
                );
            });

            it('blank lines preserved based on highligted vs cursor', async () => {
                const editor = await openEditorWithContentAndSelectAll(
                    'javascript',
                    dedent`
                    // First line
                    //
                    // Second line
                    // Third line
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    /**
                     * First line
                     *
                     * Second line
                     * Third line
                     */
                `
                );
                await toggleCommentTypeAndValidateText(
                    editor,
                    dedent`
                    First line

                    Second line
                    Third line
                `
                );
                switch (mode) {
                    case testModes.HIGHLIGHTED_SELECTION:
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            // First line
                            //
                            // Second line
                            // Third line
                        `
                        );
                        break;
                    case testModes.CURSOR_FIRST_LINE:
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                        // First line

                        Second line
                        Third line
                        `
                        );
                        break;
                    case testModes.CURSOR_MIDDLE_LINE:
                    case testModes.CURSOR_LAST_LINE:
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            First line

                            // Second line
                            // Third line
                        `
                        );
                        break;
                }
            });

            it('error when executing on blank line', async () => {
                const editor = await openEditorWithContentAndSelectAll(
                    undefined,
                    dedent`

                `
                );
                await expect(toggleCommentType(editor)).to.be.rejectedWith(errorMsg);
            });

            describe('Parsing edge cases', () => {
                // NOTE: Will filter these tests by mode

                if (mode === testModes.HIGHLIGHTED_SELECTION) {
                    it('reach block comment top when not first line of selection', async () => {
                        const editor = await openEditorWithContentAndSelectAll(
                            'javascript',
                            dedent`
                            // My line comment
                            /**
                             * My block comment
                             */
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            // // My line comment
                            // /**
                            //  * My block comment
                            //  */
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            /**
                             * // My line comment
                             * /**
                             *  * My block comment
                             *  */
                             */
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            // My line comment
                            /**
                             * My block comment
                             */
                        `
                        );
                    });

                    it('reach block comment bottom when not last line of selection', async () => {
                        const editor = await openEditorWithContentAndSelectAll(
                            'javascript',
                            dedent`
                            /**
                             * My block comment
                             */
                            // My line comment
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            // /**
                            //  * My block comment
                            //  */
                            // // My line comment
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            /**
                             * /**
                             *  * My block comment
                             *  */
                             * // My line comment
                             */
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            /**
                             * My block comment
                             */
                            // My line comment
                        `
                        );
                    });

                    it('highlighted selection smaller than valid comment, default to free text', async () => {
                        const editor = await openEditorWithContentAndHighlightSelection(
                            'typescript',
                            dedent`
                                /**
                                 * Line 1
                                 * Line 2
                                 */
                            `,
                            0,
                            ' * Line 2'.length - 1,
                            1,
                            2
                        );
                        await toggleCommentType(editor);
                        expect(editor.document.getText()).to.equal(dedent`
                            /**
                             // * Line 1
                             // * Line 2
                             */
                        `);
                        await toggleCommentType(editor);
                        expect(editor.document.getText()).to.equal(dedent`
                            /**
                             /**
                              * * Line 1
                              * * Line 2
                              */
                             */
                        `);
                        await toggleCommentType(editor);
                        expect(editor.document.getText()).to.equal(dedent`
                            /**
                             * Line 1
                             * Line 2
                             */
                        `);
                    });
                }

                if (mode === testModes.CURSOR_MIDDLE_LINE) {
                    it('reaching top and bottom extent of block comment from within', async () => {
                        const editor = await openEditorWithContentAndSelectAll(
                            'javascript',
                            dedent`
                            // My line comment
                            /**
                             * My block comment
                             */
                            // My other line comment
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            // My line comment
                            My block comment
                            // My other line comment
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            // // My line comment
                            // My block comment
                            // // My other line comment
                        `
                        );
                    });

                    it('reaching top and bottom extent of line comment from within', async () => {
                        const editor = await openEditorWithContentAndSelectAll(
                            'javascript',
                            dedent`

                            // My line comment
                            // My other line comment

                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`

                            /**
                             * My line comment
                             * My other line comment
                             */

                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`

                            My line comment
                            My other line comment

                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`

                            // My line comment
                            // My other line comment

                        `
                        );
                    });
                }

                if (mode === testModes.CURSOR_FIRST_LINE) {
                    it('reach block comment top when probing down', async () => {
                        const editor = await openEditorWithContentAndSelectAll(
                            'javascript',
                            dedent`
                            My line comment
                            /**
                             * My block comment
                             */
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            // My line comment
                            // /**
                            //  * My block comment
                            //  */
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            /**
                             * My line comment
                             * /**
                             *  * My block comment
                             *  */
                             */
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            My line comment
                            /**
                             * My block comment
                             */
                        `
                        );
                    });

                    it('reach maximum block comment probe depth, treat as free text', async () => {
                        // NOTE: Limit is 150, so should be parsed as free text and go straight to line comment
                        const editor = await openEditorWithContentAndSelectAll(
                            'javascript',
                            ['/**', _.list(0, 151, (num) => ` * Line ${num}`).join('\n'), ' */'].join('\n')
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            ['// /**', _.list(0, 151, (num) => `//  * Line ${num}`).join('\n'), '//  */'].join('\n')
                        );
                    });
                }

                if (mode === testModes.CURSOR_LAST_LINE) {
                    it('reach block comment bottom when probing up', async () => {
                        const editor = await openEditorWithContentAndSelectAll(
                            'javascript',
                            dedent`
                            /**
                             * My block comment
                             */
                            My line comment
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            // /**
                            //  * My block comment
                            //  */
                            // My line comment
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            /**
                             * /**
                             *  * My block comment
                             *  */
                             * My line comment
                             */
                        `
                        );
                        await toggleCommentTypeAndValidateText(
                            editor,
                            dedent`
                            /**
                             * My block comment
                             */
                            My line comment
                        `
                        );
                    });
                }
            });
        });
    });

    describe('auto formatting configuration setting', () => {
        let autoFormatConfig: boolean;

        before(async () => {
            autoFormatConfig = getConfig(AUTO_FORMAT_ON_COMMENT_TOGGLE);
            await vscode.workspace.getConfiguration(EXTENSION_NAME).update(AUTO_FORMAT_ON_COMMENT_TOGGLE, true);
        });

        after(async () => {
            await vscode.workspace
                .getConfiguration(EXTENSION_NAME)
                .update(AUTO_FORMAT_ON_COMMENT_TOGGLE, autoFormatConfig);
        });

        it('Rewrap formatter is invoked', async () => {
            const stub = sinon
                .stub(dependencyCommand, 'invokeDependencyCommand')
                .withArgs(DependencyCommand.REWRAP_COMMENT)
                .resolves();
            const editor = await openEditorWithContentAndSelectAll(
                'typescript',
                dedent`
                // First line
                // Second line
                // Third line
            `
            );
            await toggleCommentType(editor);
            expect(editor.document.getText()).to.equal(dedent`
                /**
                 * First line
                 * Second line
                 * Third line
                 */
            `);
            expect(stub).to.be.calledOnce;
        });

        it('error when attempting to auto-format and Rewrap is not installed', async () => {
            const editor = await openEditorWithContentAndSelectAll(
                'typescript',
                dedent`
                // First line
                // Second line
                // Third line
            `
            );
            await expect(toggleCommentType(editor)).to.be.rejectedWith(
                `Extension 'rewrap' (stkb.rewrap) is required in order to auto-format comments (see setting autoFormatOnToggleCommentType). Please ensure it has been properly installed/enabled: Extension 'stkb.rewrap' not found!`
            );
        });
    });
});
