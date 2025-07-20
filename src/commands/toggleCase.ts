import _ from 'lodash';
import vscode from 'vscode';

import { regexBasedBinaryToggle } from './shared/regexBasedBinaryToggle';
import { getConfig } from '../configuration';
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
    return hasLowercase ? _.toUpper(originalText) : _.toLower(originalText);
}
