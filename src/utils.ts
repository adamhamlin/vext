import { Match } from 'types';
import * as vscode from 'vscode';

// Some error types used to drive user messages (see handleError below)
export class UserError extends Error {}
export class UserWarning extends Error {}

const isTesting = process.env.TESTING === 'true';


/**
 * Handle any error during command execution, displaying a message to the user as appropriate.
 */
export async function handleError(fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
    } catch (err) {
        if (isTesting) {
            // Can't assert on toast messages, so don't swallow the error here
            throw err;
        } else if (err instanceof UserWarning) {
            vscode.window.showWarningMessage(err.message);
        } else if (err instanceof UserError) {
            vscode.window.showErrorMessage(err.message);
        } else if (err instanceof Error) {
            vscode.window.showErrorMessage(`Unexpected error: ${err.message}\n${err.stack}`);
        }
    }
}

/**
 * Replace the editor's current selection text with the provided new text.
 */
export async function replaceEditorSelection(editor: vscode.TextEditor, newText: string): Promise<boolean> {
    return editor.edit(builder => builder.replace(editor.selection, newText));
}

/**
 * Get the editor's current language.
 */
export function getCurrentLang(): string {
    return vscode.window.activeTextEditor?.document.languageId || 'plaintext';
}

/**
 * Returns the element after the specified element, or the first element if the last element is specified.
 * This is useful when doing "toggle" operations.
 *
 * NOTE: Assumes all elements are unique.
 */
export function getNextElement<T>(arr: T[], currentValue: T): T {
    const currentIdx = arr.indexOf(currentValue);
    const newIdx = (currentIdx + 1) % arr.length;
    return arr[newIdx];
}

/**
 * Get the selection corresponding to the word where the cursor is currently positioned. Throws an error if the cursor is not
 * positioned in a word.
 *
 * @param editor the text editor
 * @param selection the selection
 * @param extraWordChars additional characters to consider part of a word
 */
 export function getCursorWordAsSelection(editor: vscode.TextEditor, selection: vscode.Selection, extraWordChars: string[] = []): vscode.Selection {
    // We're using a regex "character class" (i.e., brackets), so we only need to escape '^', '-', ']', and '\'
    const escapedExtraWordChars = extraWordChars.map(char => {
        if (char.length !== 1) {
            throw new UserError(`All configured extra word characters must have length 1! The following is invalid: '${char}'`);
        } else if (/[\^\-\]\\]/.test(char)) {
            return '\\' + char;
        } else {
            return char;
        }
    });
    const regexStr = `[\\w${escapedExtraWordChars.join('')}]+`;
    const regex = new RegExp(regexStr, 'g');

    const lineText = editor.document.lineAt(selection.start.line).text;
    const matches: Match[] = [];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(lineText)) !== null) {
        matches.push({
            start: match.index,
            end: match.index + match[0].length,
        });
    }

    const cursorPosition = selection.active.character;
    const cursorMatch = matches.find(match => {
        // Cursor must be anywhere within the word or immediately before/after
        return cursorPosition >= match.start && cursorPosition <= match.end;
    });
    if (!cursorMatch) {
        throw new UserError('Cursor must be located within a word!');
    }
    return new vscode.Selection(
        selection.start.line,
        cursorMatch.start,
        selection.start.line,
        cursorMatch.end
    );
}