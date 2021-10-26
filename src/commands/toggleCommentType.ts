import * as vscode from 'vscode';
import { handleError, replaceSelectedText } from '../utils';
import { Comment } from '../models/comment';
import { shouldAutoFormat } from '../configuration';
import { DependencyCommand, invokeDependencyCommand } from '../commands/dependencyCommand';

export const TOGGLE_COMMENT_TYPE_CMD = 'toggleCommentType';

/**
 * Toggle the given selection between line comment, block comment, and no comment.
 *
 * NOTE: Line breaks/formatting will not be affected unless auto formatting has been activated.
 *
 * NOTE: This will use the indentation of the first line for all subsequent lines.
 *
 * @param editor the vscode TextEditor object
 * @param editorEdit the vscode TextEditorEdit object (unused)
 */
export async function toggleCommentType(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const comment = await Comment.parseCommentFromSelection(editor);
        const availableCommentTypes = comment.getAvailableCommentTypes();
        const currentIdx = availableCommentTypes.indexOf(comment.getType());
        const newIdx = (currentIdx + 1) % availableCommentTypes.length;
        const newText = comment.toCommentString(availableCommentTypes[newIdx]);
        await replaceSelectedText(editor, newText);
        if (shouldAutoFormat()) {
            await invokeDependencyCommand(DependencyCommand.REWRAP_COMMENT, 'in order to auto-format comments (see setting autoFormatOnToggleCommentType)');
        }
    });
}