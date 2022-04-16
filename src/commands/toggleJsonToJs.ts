import * as vscode from 'vscode';
import * as JSON5 from 'json5';
import { handleError, isHighlightedSelection, parseJsonStripComments, UserError } from '../utils';
import { getConfig, USE_DOUBLE_QUOTES_FOR_JS_STRINGS } from '../configuration';
import * as _ from 'lodash';

export const TOGGLE_JSON_TO_JS = 'toggleJsonToJs';


/**
 * Toggle selection between JSON and the javascript equivalent using unquoted keys where possible.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleJsonToJs(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const useDoubleQuotesForJsStrings = getConfig<boolean>(USE_DOUBLE_QUOTES_FOR_JS_STRINGS);
        const usageError = new UserError('Must select a single valid JSON or Javascript object! Javascript objects may not contain expressions.');

        if (editor.selections.length !== 1) {
            throw usageError;
        }

        const selection = editor.selections[0];
        if (!isHighlightedSelection(selection)) {
            throw usageError;
        }

        const selectionText = editor.document.getText(selection);
        const isSingleLineSelection = !_.includes(selectionText, '\n');
        const indent = isSingleLineSelection ? undefined : +(vscode.window.activeTextEditor?.options?.tabSize || 4);
        let replacementText: string;

        // Let's just deal with objects
        if (!_.startsWith(selectionText, '{') || !_.endsWith(selectionText, '}')) {
            throw usageError;
        }

        // Let's start by attempting to parse the selection as strict JSON (but may contain comments)
        try {
            const obj = parseJsonStripComments(selectionText);
            // We have JSON, let's make it Javascript
            replacementText = JSON5.stringify(obj, {
                quote: useDoubleQuotesForJsStrings ? `"` : `'`,
                space: indent,
                omitTrailingCommas: true,
                singleLinePadding: true
            });
        } catch (err) {
            // We have Javascript (or gibberish), let's make it JSON
            try {
                const obj = JSON5.parse(selectionText);
                replacementText = JSON.stringify(obj, null, indent);
            } catch (err) {
                throw usageError;
            }
        }

        await editor.edit(builder => {
            builder.replace(selection, replacementText);
        });
    });
}
