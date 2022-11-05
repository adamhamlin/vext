import vscode from 'vscode';

import { toggleCase, TOGGLE_CASE_CMD } from './toggleCase';
import { toggleCommentType, TOGGLE_COMMENT_TYPE_CMD } from './toggleCommentType';
import { toggleJsonToJsToYaml, TOGGLE_JSON_TO_JS_TO_YAML } from './toggleJsonToJsToYaml';
import { toggleQuotes, TOGGLE_QUOTES_CMD } from './toggleQuotes';
import { toggleVariableNamingFormat, TOGGLE_VARIABLE_NAMING_FORMAT_CMD } from './toggleVariableNamingFormat';

export const EXTENSION_NAME = 'vext';

export function registerAllCommands(context: vscode.ExtensionContext): void {
    // NOTE: Each of these commands must appear in package.json under `contributes.commands` and `activationEvents`.
    [
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_COMMENT_TYPE_CMD}`, toggleCommentType),
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_QUOTES_CMD}`, toggleQuotes),
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_CASE_CMD}`, toggleCase),
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_VARIABLE_NAMING_FORMAT_CMD}`, toggleVariableNamingFormat),
        vscode.commands.registerTextEditorCommand(`${EXTENSION_NAME}.${TOGGLE_JSON_TO_JS_TO_YAML}`, toggleJsonToJsToYaml)
    ].forEach(cmd => context.subscriptions.push(cmd));
}