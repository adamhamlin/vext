import vscode from 'vscode';

import { regexBasedBinaryToggle } from './shared/regexBasedBinaryToggle';
import { handleError } from '../utils';

export const TOGGLE_BASE64_ENCODING_CMD = 'toggleBase64Encoding';

/**
 * When cursor is in the middle of a word--or there is an explicit selection--toggle the base64 encoding.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleBase64Encoding(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        // NOTE: Base64 attempts to translate 3 ascii/utf digits into 4 encoded digits using a defined set of 64 characters.
        // Equals signs may appear at end of encoded string if number of input string characters isn't cleanly divisible by 3,
        // which effectively pads the length of the encoded string to be divisible by 4
        const urlEncodedRegex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
        await regexBasedBinaryToggle(editor, urlEncodedRegex, transform, { useWhitespaceDelimiter: true });
    });
}

function transform(originalText: string, isBase64Encoded: boolean): string {
    // TODO: Use base64 here
    return isBase64Encoded ? decodeBase64(originalText) : encodeBase64(originalText);
}

function encodeBase64(plaintextStr: string): string {
    return Buffer.from(plaintextStr).toString('base64');
}

function decodeBase64(base64Str: string): string {
    return Buffer.from(base64Str, 'base64').toString('utf-8');
}
