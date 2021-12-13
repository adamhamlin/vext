import * as vscode from 'vscode';
import { getCursorWordAsSelection, handleError, UserError } from '../utils';
import { CASE_EXTRA_WORD_CHARS, getConfig } from '../configuration';
import * as _ from 'lodash';
import { Match } from 'types';

export const TOGGLE_CASE_CMD = 'toggleCase';

/**
 * Finds all instances of words, including any configured "extra" word characters
 */
const EXTRA_WORD_CHARS_PLACEHOLDER = '<EXTRA_WORD_CHARS>';
const WORD_REGEX_TEMPLATE = `[\\w${EXTRA_WORD_CHARS_PLACEHOLDER}]+`;


/**
 * When cursor is in the middle of a word--or there is an explicit selection--toggle the casing used.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleCase(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const caseExtraWordChars = getConfig<string[]>(CASE_EXTRA_WORD_CHARS);
        const selectionsToToggle: vscode.Selection[] = [];

        // Will have multiple selections if multi-line cursor is used
        for (const selection of editor.selections) {
            const isMultiCharacterSelection = (selection.start.character !== selection.end.character) || (selection.start.line !== selection.end.line);

            if (isMultiCharacterSelection) {
                // Toggle the whole selection
                selectionsToToggle.push(selection);
            } else {
                // Toggle the current word the cursor is in
                const cursorSelection = getCursorWordAsSelection(editor, selection, caseExtraWordChars);
                selectionsToToggle.push(cursorSelection);
            }
        }

        if (selectionsToToggle.length) {
            // Use first selection to drive casing decision for all others
            const transformFn = getCaseTransformFn(editor.document.getText(selectionsToToggle[0]));

            await editor.edit(builder => {
                for (const selection of selectionsToToggle) {
                    const newText = transformFn(editor.document.getText(selection));
                    builder.replace(selection, newText);
                }
            });
        } else {
            // I don't know if this can happen
            throw Error("No selections found!");
        }
    });
}

/**
 * Get target casing transform function (i.e., upper or lower) based on current text.
 */
function getCaseTransformFn(originalText: string): (s: string) => string {
    const hasLowercase = /[a-z]/.test(originalText);
    return hasLowercase ? _.toUpper : _.toLower;
}
