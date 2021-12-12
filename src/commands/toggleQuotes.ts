import * as vscode from 'vscode';
import { getNextElement, handleError, UserError } from '../utils';
import { getConfig, QUOTE_CHARS } from '../configuration';
import * as _ from 'lodash';

export const TOGGLE_QUOTES_CMD = 'toggleQuotes';

/**
 * Finds all instances of: An unescaped quote character thru the next occurrence of the same unescaped character.
 *
 * NOTE: This assumes the text input is "sensical", i.e., no sntax errors would be present in an IDE.
 */
const QUOTE_CHARS_PLACEHOLDER = '<QUOTED_CHARS>';
const QUOTE_REGEX_TEMPLATE = `(?<!\\\\)([${QUOTE_CHARS_PLACEHOLDER}])(?:[^\\1\\\\]|\\\\.)*?\\1`;

/**
 * Similar to above, but backticks-only and ignores if includes templating -- e.g. `Here is my ${template} string`.
 *
 * NOTE: This may erroneously capture the area between concatentation of 2 templated backtick strings, but that doesn't
 * really matter because you wouldn't/shouldn't have your cursor there.
 */
const BACKTICK_QUOTE_REGEX = '(?<!\\\\)`(?:[^`\\\\{]|\\\\.|(?<!\\$)\\{)*?`';

type Char = string;
type QuoteMatch = {
    start: number;
    end: number;
    quoteChar: Char;
    innerText: string;
};
type QuoteReplacement = {
    selection: vscode.Selection,
    replacementText: string
}


/**
 * When cursor is in the middle of a quoted string, toggle the quote characters used.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleQuotes(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const quoteChars = getConfig<string[]>(QUOTE_CHARS);
        for (const char of quoteChars) {
            if (_.escapeRegExp(char).length !== 1) {
                throw new UserError('All configured quote characters must be strings of length 1 and cannot be special regex characters!');
            }
        }

        const quotesToReplace: QuoteReplacement[] = [];
        let newQuoteChar = '';

        // Will have multiple selections if multi-line cursor is used
        for (const selection of editor.selections) {
            if (selection.start.line !== selection.end.line) {
                throw new UserError('Cannot process multi-line selection! However, multi-line cursors are supported.');
            }
            const lineText = editor.document.lineAt(selection.start.line).text;
            const matches = getQuotedStrings(lineText, quoteChars);
            const cursorPosition = selection.active.character;
            const cursorMatch = matches.find(match => {
                // Cursor must be anywhere within the quote or immediately before/after
                return cursorPosition >= match.start && cursorPosition <= match.end;
            });
            if (!cursorMatch) {
                throw new UserError('Cursor must be located within a properly-quoted string! If a backtick string, it cannot contain templating.');
            }

            // We'll take the first quote char we see so we can convert every line to the same new quote char
            if (!newQuoteChar) {
                newQuoteChar = getNextElement(quoteChars, cursorMatch.quoteChar);
            }

            quotesToReplace.push({
                replacementText: getReplacementText(cursorMatch, newQuoteChar),
                selection: new vscode.Selection(
                    selection.start.line,
                    cursorMatch.start,
                    selection.start.line,
                    cursorMatch.end
                )
            });
        }

        if (quotesToReplace.length) {
            await editor.edit(builder => {
                for (const quote of quotesToReplace) {
                    builder.replace(quote.selection, quote.replacementText);
                }
            });
        } else {
            // I don't know if this can happen
            throw Error("No selections found!");
        }
    });
}

/**
 * Get all instances of quoted strings in the given line of text.
 *
 * @param line the text to process
 * @param quoteChars the quote characters to look for
 */
function getQuotedStrings(line: string, quoteChars: string[]): QuoteMatch[] {
    // We need special handling for backticks, if configured
    const standardQuoteChars = _.without(quoteChars, '`');
    const usingBackticks = standardQuoteChars.length < quoteChars.length;

    let regexStr = QUOTE_REGEX_TEMPLATE.replace(QUOTE_CHARS_PLACEHOLDER, standardQuoteChars.join(''));
    if (usingBackticks) {
        regexStr += '|' + BACKTICK_QUOTE_REGEX;
    }
    const regex = new RegExp(regexStr, 'g');
    const res: QuoteMatch[] = [];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
        const matchLength = match[0].length;
        res.push({
            start: match.index,
            end: match.index + matchLength,
            quoteChar: match[1],
            innerText: match[0].substring(1, matchLength - 1)
        });
    }
    return res;
}

/**
 * Get the text that should replace the given quote.
 */
function getReplacementText(quoteMatch: QuoteMatch, newQuoteChar: Char): string {
    const oldQuoteChar = quoteMatch.quoteChar;
    const innerText = (newQuoteChar === oldQuoteChar) ? quoteMatch.innerText : quoteMatch.innerText
        .replace(new RegExp(newQuoteChar, 'g'), '\\' + newQuoteChar)    // new quote char needs to be escaped
        .replace(new RegExp('\\\\' + oldQuoteChar, 'g'), oldQuoteChar); // original quote needs to be unescaped
    return newQuoteChar + innerText + newQuoteChar;
}
