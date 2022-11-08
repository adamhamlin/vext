import vscode from 'vscode';

/**
 * Open a text document with the given language/content and make it the active document.
 *
 * @param language the language for the document. Use undefined to not specify a language
 * @param content the string content of the document
 */
export async function openEditorWithContent(language: string | undefined, content: string): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument({ content, language });
    const editor = await vscode.window.showTextDocument(document);
    return editor;
}

/**
 * Accomplish openEditorWithContent then select all the text therein.
 *
 * @param language the language for the document. Use undefined to not specify a language
 * @param content the string content of the document
 */
export async function openEditorWithContentAndSelectAll(
    language: string | undefined,
    content: string
): Promise<vscode.TextEditor> {
    const editor = await openEditorWithContent(language, content);
    await vscode.commands.executeCommand('editor.action.selectAll');
    return editor;
}

/**
 * Accomplish openEditorWithContent then set the cursor to the specified position.
 *
 * NOTE: Currently this assumes only 1 line of content.
 *
 * @param language the language for the document. Use undefined to not specify a language
 * @param content the string content of the document
 * @param cursorPosition the column position to set the cursor
 */
export async function openEditorWithContentAndSetCursor(
    language: string | undefined,
    content: string,
    cursorPosition: number
): Promise<vscode.TextEditor> {
    const editor = await openEditorWithContent(language, content);
    await vscode.commands.executeCommand('cursorMove', { to: 'right', by: 'character', value: cursorPosition });
    return editor;
}

/**
 * Accomplish openEditorWithContent then highlight/select the specified section.
 *
 * NOTE: Currently this assumes only 1 line of content.
 *
 * @param language the language for the document. Use undefined to not specify a language
 * @param content the string content of the document
 * @param start the column position on first line to start the selection
 * @param end the column position on last line to end the selection
 * @param startLine the index of the first line in the selection
 * @param numLines the total number of lines in desired selection
 */
export async function openEditorWithContentAndHighlightSelection(
    language: string | undefined,
    content: string,
    start: number,
    end: number,
    startLine = 0,
    numLines = 1
): Promise<vscode.TextEditor> {
    const editor = await openEditorWithContent(language, content);
    if (startLine > 0) {
        await vscode.commands.executeCommand('cursorMove', { to: 'down', value: startLine });
    }
    await vscode.commands.executeCommand('cursorMove', { to: 'right', by: 'character', value: start });
    if (numLines > 1) {
        await vscode.commands.executeCommand('cursorMove', { to: 'down', value: numLines - 1, select: true });
    }
    await vscode.commands.executeCommand('cursorMove', {
        to: 'right',
        by: 'character',
        value: end - start,
        select: true,
    });
    return editor;
}
