import { JsonObjectOrArray, Match } from 'types';
import * as vscode from 'vscode';
import { parse } from 'comment-json';
import _ = require('lodash');

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
 * Replace the specified selection with the provided new text.
 */
export async function replaceEditorSelection(editor: vscode.TextEditor, newText: string, selection: vscode.Selection): Promise<boolean> {
    return editor.edit(builder => builder.replace(selection, newText));
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
    const regex = getWordsRegex(extraWordChars, false);
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

/**
 * @param text the text to test
 * @param extraWordChars characters that should also be considered a member of \w class
 * @returns true if text is a single word
 */
export function isWord(text: string, extraWordChars: string[]): boolean {
    return getWordsRegex(extraWordChars, true).test(text);
}

/**
 * Parse a JSON string and return JSON object, stripping comments if present.
 */
export function parseJsonStripComments<T extends JsonObjectOrArray>(jsonStr: string): T {
    return parse(jsonStr, undefined, true) as unknown as T;
}

/**
 * Returns true if the given selection is a "highlighted" selection (i.e., not just a standalone cursor)
 */
export function isHighlightedSelection(selection: vscode.Selection): boolean {
    return (selection.start.character !== selection.end.character) || (selection.start.line !== selection.end.line);
}

/**
 * Helper to get a regex for words, including the provided extra characters
 */
function getWordsRegex(extraWordChars: string[], matchFullLine: boolean): RegExp {
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
    let regexStr = `[\\w${escapedExtraWordChars.join('')}]+`;
    if (matchFullLine) {
        regexStr = `^${regexStr}$`;
    }
    return new RegExp(regexStr, 'g');
}

type CollectTxFunction<T, R> = (el: T, idx: number) => R | undefined;

function collectHelper<T, R>(arr: T[], tx: CollectTxFunction<T, R>, firstOnly: false, haltOnError: boolean): R[];
function collectHelper<T, R>(arr: T[], tx: CollectTxFunction<T, R>, firstOnly: true, haltOnError: boolean): R | undefined;
function collectHelper<T, R>(arr: T[], tx: CollectTxFunction<T, R>, firstOnly: boolean, haltOnError: boolean): R[] | R | undefined {
    const res: R[] = [];
    _.forEach(arr, (el, idx) => {
        let transformed: R | undefined;
        try {
            transformed = tx(el, idx);
        } catch (err) {
            if (haltOnError) {
                throw err;
            }
        }
        if (transformed !== undefined) {
            res.push(transformed);
            if (firstOnly) {
                return false;
            }
        }
    });
    return firstOnly ? res[0] : res;
}

export function collect<T, R>(arr: T[], tx: CollectTxFunction<T, R>, haltOnError = false): R[] {
    return collectHelper<T, R>(arr, tx, false, haltOnError);
}

export function collectFirst<T, R>(arr: T[], tx: CollectTxFunction<T, R>, haltOnError = false): R | undefined {
    return collectHelper<T, R>(arr, tx, true, haltOnError);
}

/**
 * Create new array with all elements moved n positions to the right.
 */
export function rotate<T>(arr: T[], n: number): T[] {
    n = n % arr.length;
    return arr.slice(n, arr.length).concat(arr.slice(0, n));
}