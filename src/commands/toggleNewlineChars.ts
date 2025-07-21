import { match } from 'ts-pattern';
import vscode from 'vscode';

import { UserError, handleError, isHighlightedSelection, isMultiLineSelection } from '../utils';

export const TOGGLE_NEWLINE_CHARS_CMD = 'toggleNewlineChars';

/**
 * Toggle a selection of text between visible newlines and \n characters
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleNewlineChars(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const usageError = new UserError('Must select a section of text!');

        /* c8 ignore next 3 */
        if (editor.selections.length !== 1) {
            throw usageError;
        }

        const selection = editor.selections[0];
        if (!isHighlightedSelection(selection)) {
            throw usageError;
        }

        const currentText = editor.document.getText(selection);
        const isMultiLine = isMultiLineSelection(selection);
        const [crlf, literalCrlf, literalCrlfRegexStr] = ['\n', '\\n', '\\\\n'];

        const replacementText = match(isMultiLine)
            .with(true, () => currentText.replace(new RegExp(crlf, 'g'), literalCrlf)) // convert to single-line
            .with(false, () => currentText.replace(new RegExp(literalCrlfRegexStr, 'g'), crlf)) // convert to multi-line
            .exhaustive();

        await editor.edit((builder) => {
            builder.replace(selection, replacementText);
        });
    });
}
