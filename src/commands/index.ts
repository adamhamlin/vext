import * as vscode from 'vscode';
import { toggleCommentType, TOGGLE_COMMENT_TYPE_CMD } from './toggleCommentType';

export const EXTENSION_NAME = 'text-toggler';

export function registerAllCommands(context: vscode.ExtensionContext): void {
    // NOTE: Each of these commands must appear in package.json under `contributes.commands` and `activationEvents`.
    [
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_COMMENT_TYPE_CMD}`, toggleCommentType)
    ].forEach(cmd => context.subscriptions.push(cmd));
}