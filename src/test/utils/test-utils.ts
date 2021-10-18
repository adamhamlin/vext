import * as vscode from 'vscode';

// TODO: remove this if not using
export async function openFile(content: string): Promise<vscode.TextDocument> {
    const document = await vscode.workspace.openTextDocument(content);
    vscode.window.showTextDocument(document);
    return document;
}
