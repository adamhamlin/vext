import * as vscode from 'vscode';
import { toggleCommentType, TOGGLE_COMMENT_TYPE_CMD } from './toggleCommentType';
import { toggleQuotes, TOGGLE_QUOTES_CMD } from './toggleQuotes';
import { toggleCase, TOGGLE_CASE_CMD } from './toggleCase';

export const EXTENSION_NAME = 'vext';

export function registerAllCommands(context: vscode.ExtensionContext): void {
    // NOTE: Each of these commands must appear in package.json under `contributes.commands` and `activationEvents`.
    [
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_COMMENT_TYPE_CMD}`, toggleCommentType),
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_QUOTES_CMD}`, toggleQuotes),
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_CASE_CMD}`, toggleCase)
    ].forEach(cmd => context.subscriptions.push(cmd));
}