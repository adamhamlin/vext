import vscode from 'vscode';

import { getConfig } from '../configuration';
import { regexBasedBinaryToggle } from './shared/regexBasedBinaryToggle';
import { CASE_EXTRA_WORD_CHARS } from '../configuration/configuration.constants';
import { handleError } from '../utils';

export const TOGGLE_CASE_CMD = 'toggleCase';

/**
 * When cursor is in the middle of a word--or there is an explicit selection--toggle the casing used.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleCase(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const extraWordChars = getConfig<string[]>(CASE_EXTRA_WORD_CHARS);
        const hasLowercaseRegex = /[a-z]/;
        await regexBasedBinaryToggle(editor, hasLowercaseRegex, transform, { extraWordChars });
    });
}

function transform(originalText: string, hasLowercase: boolean): string {
    return hasLowercase ? originalText.toUpperCase() : originalText.toLowerCase();
}
