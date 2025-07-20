import _ from 'lodash';
import vscode from 'vscode';

import { getConfig } from '../configuration';
import { VARIABLE_NAMING_FORMATS } from '../configuration/configuration.constants';
import { getCursorWordAsSelection, getNextElement, handleError, UserError } from '../utils';

export const TOGGLE_VARIABLE_NAMING_FORMAT_CMD = 'toggleVariableNamingFormat';

enum VariableNamingFormat {
    CAMEL = 'camel',
    PASCAL = 'pascal',
    SNAKE = 'snake',
    SNAKE_UPPER = 'snakeUpper',
    KEBAB = 'kebab',
    KEBAB_UPPER = 'kebabUpper',
}
type NamingFormatRegexMap = Record<VariableNamingFormat, RegExp>;

/**
 * Collection of regexes to detect/test the associated format.
 */
const supportedNamingFormats: NamingFormatRegexMap = {
    [VariableNamingFormat.CAMEL]: /^[a-z][a-z0-9]*(?:[A-Za-z0-9]+)*$/,
    [VariableNamingFormat.PASCAL]: /^[A-Z][a-z0-9]*(?:[A-Za-z0-9]+)*$/,
    [VariableNamingFormat.SNAKE]: /^(?:[a-z][a-z0-9]*)(?:_[a-z0-9]+)*$/,
    [VariableNamingFormat.SNAKE_UPPER]: /^(?:[A-Z][A-Z0-9]*)(?:_[A-Z0-9]+)*$/,
    [VariableNamingFormat.KEBAB]: /^(?:[a-z][a-z0-9]*)(?:-[a-z0-9]+)*$/,
    [VariableNamingFormat.KEBAB_UPPER]: /^(?:[A-Z][A-Z0-9]*)(?:-[A-Z0-9]+)*$/,
};

/**
 * A regex to tokenize camel case or pascal case using String.split(regex)
 */
const CAMEL_PASCAL_SPLITTER_REGEX = /(?<!(^|[A-Z0-9]))(?=[A-Z0-9])|(?<!^)(?=[A-Z0-9][a-z0-9])/g;

/**
 * When cursor is in the middle of a word--or there is an explicit selection--toggle the casing used.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleVariableNamingFormat(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const namingFormatRegexMap = getConfig<VariableNamingFormat[]>(VARIABLE_NAMING_FORMATS).reduce(
            (accumulator, format) => {
                if (!supportedNamingFormats[format]) {
                    throw new UserError(`Variable naming format '${format}' is not supported!`);
                }
                accumulator[format] = supportedNamingFormats[format];
                return accumulator;
            },
            {} as NamingFormatRegexMap
        );
        const selectionsToToggle: vscode.Selection[] = [];

        // Will have multiple selections if multi-line cursor is used
        for (const selection of editor.selections) {
            if (selection.start.line !== selection.end.line) {
                throw new UserError('Cannot process multi-line selection! However, multi-line cursors are supported.');
            }

            // Toggle the current word the cursor is in
            const cursorSelection = getCursorWordAsSelection(editor, selection, { extraWordChars: ['-'] });
            selectionsToToggle.push(cursorSelection);
        }

        if (selectionsToToggle.length) {
            // Use first selection to drive format decision for all others
            const currentFormat = getCurrentNamingFormat(
                editor.document.getText(selectionsToToggle[0]),
                namingFormatRegexMap
            );
            const targetFormat = getNextElement(_.keys(namingFormatRegexMap), currentFormat) as VariableNamingFormat;

            await editor.edit((builder) => {
                for (const selection of selectionsToToggle) {
                    const newText = transformNamingFormat(
                        editor.document.getText(selection),
                        namingFormatRegexMap,
                        targetFormat
                    );
                    builder.replace(selection, newText);
                }
            });
            /* c8 ignore next 4 */
        } else {
            // I don't know if this can happen
            throw Error('No selections found!');
        }
    });
}

/**
 * Get current variable naming format for the given text.
 */
function getCurrentNamingFormat(originalText: string, formatToRegexMap: NamingFormatRegexMap): VariableNamingFormat {
    const formatList = _.keys(formatToRegexMap) as VariableNamingFormat[];
    const currentFormat = _.find(formatList, (format) => {
        return formatToRegexMap[format].test(originalText);
    });
    if (!currentFormat) {
        throw new UserError('Current word does not match any expected variable naming format!');
    }
    return currentFormat;
}

/**
 * Transform given text into target naming format.
 */
function transformNamingFormat(
    text: string,
    formatToRegexMap: NamingFormatRegexMap,
    targetFormat: VariableNamingFormat
): string {
    const currentFormat = getCurrentNamingFormat(text, formatToRegexMap);

    // Tokenize string according to current format
    let tokenized: string[];
    switch (currentFormat) {
        case VariableNamingFormat.CAMEL:
        case VariableNamingFormat.PASCAL:
            tokenized = text.split(CAMEL_PASCAL_SPLITTER_REGEX).filter(_.isString); // remove empty word boundary matches
            break;
        case VariableNamingFormat.SNAKE:
        case VariableNamingFormat.SNAKE_UPPER:
            tokenized = text.split('_');
            break;
        case VariableNamingFormat.KEBAB:
        case VariableNamingFormat.KEBAB_UPPER:
            tokenized = text.split('-');
            break;
    }

    // Synthesize taget format from tokens
    switch (targetFormat) {
        case VariableNamingFormat.CAMEL:
        case VariableNamingFormat.PASCAL: {
            const pascal = tokenized.map((token) => token[0].toUpperCase() + token.substr(1).toLowerCase()).join('');
            // Pascal and camel are the same except for casing of first letter
            return targetFormat === VariableNamingFormat.PASCAL ? pascal : pascal[0].toLowerCase() + pascal.substr(1);
        }
        case VariableNamingFormat.SNAKE:
        case VariableNamingFormat.SNAKE_UPPER: {
            const snake = tokenized.join('_');
            return targetFormat === VariableNamingFormat.SNAKE_UPPER ? snake.toUpperCase() : snake.toLowerCase();
        }
        case VariableNamingFormat.KEBAB:
        case VariableNamingFormat.KEBAB_UPPER: {
            const kebab = tokenized.join('-');
            return targetFormat === VariableNamingFormat.KEBAB_UPPER ? kebab.toUpperCase() : kebab.toLowerCase();
        }
    }
}
