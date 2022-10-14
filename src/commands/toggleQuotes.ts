import * as vscode from 'vscode';
import { getCursorWordAsSelection, getNextElement, handleError, isHighlightedSelection, isWord, UserError } from '../utils';
import { getConfig, QUOTE_CHARS } from '../configuration';
import * as _ from 'lodash';
import { Match } from '../types';

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
type QuoteMatch = Match & {
    startLine: number;
    endLine: number;
    quoteChar: Char;
    innerText: string;
    allowUnquoted: boolean;
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
        const extraWordChars: string[] = []; // TODO: Make this configurable?
        for (const char of quoteChars) {
            if (_.escapeRegExp(char).length !== 1) {
                throw new UserError('All configured quote characters must be strings of length 1 and cannot be special regex characters!');
            }
        }

        // Will have multiple selections if multi-line cursor is used
        const quoteMatches: QuoteMatch[] = editor.selections.map(selection => {
            let quoteMatch: QuoteMatch | undefined;

            if (isHighlightedSelection(selection)) {
                // Just toggle quotes around the entire selection
                const regexStr = `^([${quoteChars.join('')}])[\\s|\\S]*\\1$`;
                const selectionText = editor.document.getText(selection);
                const quoteChar = (new RegExp(regexStr)).exec(selectionText)?.[1] || '';
                const innerText = quoteChar ? selectionText.substring(1, selectionText.length - 1) : selectionText;
                quoteMatch = {
                    startLine: selection.start.line,
                    endLine: selection.end.line,
                    start: selection.start.character,
                    end: selection.end.character,
                    innerText,
                    quoteChar,
                    allowUnquoted: true
                };
            } else {
                // Try to extrapolate a properly-quoted string around the current cursor position
                const lineNumber = selection.start.line;
                const lineText = editor.document.lineAt(lineNumber).text;
                const matches = getQuotedStrings(lineText, lineNumber, quoteChars, extraWordChars);
                const cursorPosition = selection.active.character;
                quoteMatch = matches.find(match => {
                    // Cursor must be anywhere within the quote or immediately before/after
                    return cursorPosition >= match.start && cursorPosition <= match.end;
                });

                // If we didn't find the cursor w/in a properly-quoted string, but we do find it within an (unquoted) word,
                // let's add quotes to this unquoted word.
                if (!quoteMatch) {
                    try {
                        const cursorWordSelection = getCursorWordAsSelection(editor, selection, extraWordChars);
                        if (cursorWordSelection) {
                            quoteMatch = {
                                startLine: lineNumber,
                                endLine: lineNumber,
                                start: cursorWordSelection.start.character,
                                end: cursorWordSelection.end.character,
                                innerText: editor.document.getText(cursorWordSelection),
                                quoteChar: '',
                                allowUnquoted: true
                            };
                        } else {
                            throw new Error('catch me!');
                        }
                    } catch (err) {
                        throw new UserError('Cursor must be located within a properly-quoted string or unquoted word! If a backtick string, it cannot contain templating.');
                    }
                }

            }
            return quoteMatch;
        });

        if (quoteMatches.length) {
            if (quoteMatches.every(match => match.allowUnquoted)) {
                quoteChars.push('');
            }
            // We'll use first quote character as starting point so we can convert every line to the same new quote char
            const newQuoteChar = getNextElement(quoteChars, quoteMatches[0].quoteChar);
            const quotesToReplace: QuoteReplacement[] = quoteMatches.map(match => {
                return {
                    replacementText: getReplacementText(match, newQuoteChar),
                    selection: new vscode.Selection(
                        match.startLine,
                        match.start,
                        match.endLine,
                        match.end
                    )
                };
            });

            // Sometimes non-highlighted selections can become highlighted after replacement--which can lead to undesirable behavior.
            // Make a note of this now so we can undo it afterwards (only need to check first selection)
            const removeHighlighting = !isHighlightedSelection(editor.selections[0]);

            await editor.edit(builder => {
                for (const quote of quotesToReplace) {
                    builder.replace(quote.selection, quote.replacementText);
                }
            });

            if (removeHighlighting) {
                editor.selections = editor.selections.map(s => new vscode.Selection(s.active, s.active));
            }
        } else {
            // I don't know if this can happen
            throw Error('No selections found!');
        }
    });
}

/**
 * Get all instances of quoted strings in the given line of text.
 *
 * @param line the text to process
 * @param lineNumber the line number of line
 * @param quoteChars the quote characters to look for
 * @param extraWordChars additional characters to consider part of a word
 */
function getQuotedStrings(line: string, lineNumber: number, quoteChars: string[], extraWordChars: string[]): QuoteMatch[] {
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
        const innerText = match[0].substring(1, matchLength - 1);
        res.push({
            startLine: lineNumber,
            endLine: lineNumber,
            start: match.index,
            end: match.index + matchLength,
            quoteChar: match[1] || '`',
            innerText: match[0].substring(1, matchLength - 1),
            allowUnquoted: isWord(innerText, extraWordChars)
        });
    }
    return res;
}

/**
 * Get the text that should replace the given quote.
 */
function getReplacementText(quoteMatch: QuoteMatch, newQuoteChar: Char): string {
    const oldQuoteChar = quoteMatch.quoteChar;
    let innerText = quoteMatch.innerText;
    if (newQuoteChar !== oldQuoteChar) {
        if (newQuoteChar !== '') {
            // Any existing new quote chars need to be escaped
            innerText = innerText.replace(new RegExp(newQuoteChar, 'g'), '\\' + newQuoteChar);
        }
        if (oldQuoteChar !== '') {
            // Already-escaped original quote chars need to be unescaped
            innerText = innerText.replace(new RegExp('\\\\' + oldQuoteChar, 'g'), oldQuoteChar);
        }
    }
    return newQuoteChar + innerText + newQuoteChar;
}
