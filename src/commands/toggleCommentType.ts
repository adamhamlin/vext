import vscode from 'vscode';

import { DependencyCommand, invokeDependencyCommand } from '../commands/dependencyCommand';
import { shouldAutoFormat } from '../configuration';
import { Comment } from '../models/comment/comment';
import { getNextElement, handleError, replaceEditorSelection } from '../utils';

export const TOGGLE_COMMENT_TYPE_CMD = 'toggleCommentType';

/**
 * Toggle the given selection between line comment, block comment, and no comment.
 *
 * NOTE: Line breaks/formatting will not be affected unless auto formatting has been activated.
 *
 * NOTE: This will use the indentation of the first line for all subsequent lines.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleCommentType(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const comment = await Comment.parseCommentFromSelection(editor);
        const availableCommentTypes = comment.getAvailableCommentTypes();
        const newCommentType = getNextElement(availableCommentTypes, comment.getType());
        const newText = comment.toCommentString(newCommentType);
        await replaceEditorSelection(editor, newText, comment.selection);
        if (shouldAutoFormat()) {
            await invokeDependencyCommand(
                DependencyCommand.REWRAP_COMMENT,
                'in order to auto-format comments (see setting autoFormatOnToggleCommentType)'
            );
        }
    });
}
