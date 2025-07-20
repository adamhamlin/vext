import vscode from 'vscode';

import { CursorWordOptions } from '../../types';
import { getCursorWordAsSelection, handleError, isHighlightedSelection } from '../../utils';

/**
 * This function will use a regex to test a selection or word, transforming it according to provided transformFn.
 * It allows for a multiline selection, but assumes all lines follow the pattern of the first line.
 */
export async function regexBasedBinaryToggle(
    editor: vscode.TextEditor,
    regex: RegExp,
    transformFn: (str: string, isMatch: boolean) => string,
    cursorWordOptions?: CursorWordOptions
): Promise<void> {
    await handleError(async () => {
        const selectionsToToggle: vscode.Selection[] = [];

        // Will have multiple selections if multi-line cursor is used
        for (const selection of editor.selections) {
            if (isHighlightedSelection(selection)) {
                // Toggle the whole selection
                selectionsToToggle.push(selection);
            } else {
                // Toggle the current word the cursor is in
                const cursorSelection = getCursorWordAsSelection(editor, selection, cursorWordOptions);
                selectionsToToggle.push(cursorSelection);
            }
        }

        if (selectionsToToggle.length) {
            // Use first selection to drive pattern decision for all others
            const isMatch = regex.test(editor.document.getText(selectionsToToggle[0]));

            await editor.edit((builder) => {
                for (const selection of selectionsToToggle) {
                    const newText = transformFn(editor.document.getText(selection), isMatch);
                    builder.replace(selection, newText);
                }
            });
            /* c8 ignore next 4 */
        } else {
            // I don't know if this can happen
            throw Error('No selections found!');
        }
    });
}
