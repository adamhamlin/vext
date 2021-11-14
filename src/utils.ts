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
