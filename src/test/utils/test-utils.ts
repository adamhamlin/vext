import * as vscode from 'vscode';

/**
 * Open a text document with the given language and content, then make it the active document and
 * select all the text therein.
 *
 * @param language the language for the document. Use undefined to not specify a language
 * @param content the string content of the document
 */
export async function openEditorWithContent(language: string | undefined, content: string): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument({content, language});
    const editor = await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('editor.action.selectAll');
    return editor;
}
