import * as vscode from 'vscode';
import { handleError, UserError } from '../utils';
import { CASE_EXTRA_WORD_CHARS, getConfig } from '../configuration';
import * as _ from 'lodash';

export const TOGGLE_CASE_CMD = 'toggleCase';

/**
 * Finds all instances of words, including any configured "extra" word characters
 */
const EXTRA_WORD_CHARS_PLACEHOLDER = '<EXTRA_WORD_CHARS>';
const WORD_REGEX_TEMPLATE = `[\\w${EXTRA_WORD_CHARS_PLACEHOLDER}]+`;

type WordMatch = {
    start: number;
    end: number;
};


/**
 * When cursor is in the middle of a word--or there is an explicit selection--toggle the casing used.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleCase(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const caseExtraWordChars = getConfig<string[]>(CASE_EXTRA_WORD_CHARS).map(char => {
            if (char.length !== 1) {
                throw new UserError(`All configured caseExtraWordChars must have length 1! The following is invalid: '${char}'`);
            } else if (/[\^\-\]\\]/.test(char)) {
                // WORD_REGEX_TEMPLATE uses a regex "character class" (i.e., brackets), so we only need to escape '^', '-', ']', and '\'
                return '\\' + char;
            } else {
                return char;
            }
        });

        const selectionsToToggle: vscode.Selection[] = [];

        // Will have multiple selections if multi-line cursor is used
        for (const selection of editor.selections) {
            const isMultiCharacterSelection = (selection.start.character !== selection.end.character) || (selection.start.line !== selection.end.line);

            if (isMultiCharacterSelection) {
                // Toggle the whole selection
                selectionsToToggle.push(selection);
            } else {
                // Toggle the current word the cursor is in
                const lineText = editor.document.lineAt(selection.start.line).text;
                const matches = getWords(lineText, caseExtraWordChars);
                const cursorPosition = selection.active.character;
                const cursorMatch = matches.find(match => {
                    // Cursor must be anywhere within the word or immediately before/after
                    return cursorPosition >= match.start && cursorPosition <= match.end;
                });
                if (!cursorMatch) {
                    throw new UserError('Cursor must be located within a word if not selecting a section of text!');
                }
                selectionsToToggle.push(new vscode.Selection(
                    selection.start.line,
                    cursorMatch.start,
                    selection.start.line,
                    cursorMatch.end
                ));
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
 * Get all instances of words in the given line of text.
 *
 * @param line the text to process
 * @param caseExtraWordChars additional characters to consider part of a word
 */
function getWords(line: string, caseExtraWordChars: string[]): WordMatch[] {
    const regexStr = WORD_REGEX_TEMPLATE.replace(EXTRA_WORD_CHARS_PLACEHOLDER, caseExtraWordChars.join(''));
    const regex = new RegExp(regexStr, 'g');
    const res: WordMatch[] = [];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
        res.push({
            start: match.index,
            end: match.index + match[0].length,
        });
    }
    return res;
}

/**
 * Get target casing transform function (i.e., upper or lower) based on current text.
 */
function getCaseTransformFn(originalText: string): (s: string) => string {
    const hasLowercase = /[a-z]/.test(originalText);
    return hasLowercase ? _.toUpper : _.toLower;
}
