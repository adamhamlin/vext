import * as vscode from 'vscode';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as dedent from 'dedent';
import { toggleCommentType } from '../../commands/toggleCommentType';
import { AUTO_FORMAT_ON_COMMENT_TOGGLE, getConfig } from '../../configuration';
import { openEditorWithContentAndSelectAll } from '../utils/test-utils';
import { EXTENSION_NAME } from '../../commands';
import _ = require('lodash');

const expect = chai.expect;
chai.use(chaiAsPromised);


/**
 * NOTE: Be sure to run these tests with --disable-extensions flag
 */

describe('toggleCommentType cycles from line comment, to block, to free text, back to line comment', () => {

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    it('javascript', async () => {
        const editor = await openEditorWithContentAndSelectAll('javascript', dedent`
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
        const editor = await openEditorWithContentAndSelectAll('python', dedent`
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
        const editor = await openEditorWithContentAndSelectAll('shellscript', dedent`
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
        // We'll also test blank lines in middle of text
        const editor = await openEditorWithContentAndSelectAll(undefined, dedent`
            First line

            Second line
            Third line
        `);
        await toggleCommentType(editor);
        expect(editor.document.getText(editor.selection)).to.equal(dedent`
            // First line
            //
            // Second line
            // Third line
        `);
        await toggleCommentType(editor);
        expect(editor.document.getText(editor.selection)).to.equal(dedent`
            /**
             * First line
             *
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

        const editor = await openEditorWithContentAndSelectAll('ruby', linesToStr([
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
