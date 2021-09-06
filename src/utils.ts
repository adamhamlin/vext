import * as vscode from 'vscode';

// Some error types used to drive user messages (see handleError below)
export class UserError extends Error {}
export class UserWarning extends Error {}

/**
 * Handle any error during command execution, displaying a message to the user as appropriate.
 */
export async function handleError(fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
    } catch (err) {
        if (err instanceof UserWarning) {
            vscode.window.showWarningMessage(err.message);
        } else if (err instanceof UserError) {
            vscode.window.showErrorMessage(err.message);
        } else {
            vscode.window.showErrorMessage(`Unexpected error: ${err.message}\n${err.stack}`);
        }
    }
}

/**
 * Replace the editor's current selection text with the provided new text.
 */
export async function replaceSelectedText(editor: vscode.TextEditor, newText: string): Promise<boolean> {
    return editor.edit(builder => builder.replace(editor.selection, newText));
}

/**
 * Get the editor's current language.
 */
export function getCurrentLang(): string {
    return vscode.window.activeTextEditor?.document.languageId || 'plaintext';
}
