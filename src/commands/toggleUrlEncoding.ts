import vscode from 'vscode';

import { handleError } from '../utils';
import { regexBasedBinaryToggle } from './shared/regexBasedBinaryToggle';

export const TOGGLE_URL_ENCODING_CMD = 'toggleUrlEncoding';

/**
 * When cursor is in the middle of a word--or there is an explicit selection--toggle the URL encoding.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleUrlEncoding(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        // Looking for any % followed by 2 hex digits, signifying an actual replacement has been done. Otherwise,
        // there is nothing to "decode"
        const urlEncodedRegex = /%[0-9a-fA-F]{2}/;
        await regexBasedBinaryToggle(editor, urlEncodedRegex, transform, { useWhitespaceDelimiter: true });
    });
}

function transform(originalText: string, isUrlEncoded: boolean): string {
    return isUrlEncoded ? decodeURIComponent(originalText) : encodeURIComponent(originalText);
}
