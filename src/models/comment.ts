import * as vscode from 'vscode';
import * as _ from 'lodash';
import { CommentConfig, getCommentConfigForLanguage } from '../configuration';
import extractComments = require('multilang-extract-comments'); // can't get this to work with nicer syntax :(

export enum CommentType {
    BLOCK_COMMENT = 'multiline',
    LINE_COMMENT = 'singleline',
    NO_COMMENT = 'none'
}

/**
 * Abstraction for a comment (or any block of non-code text)
 */
export class Comment {
    private type: CommentType;
    private lines: string[];
    private indentation: Indentation;
    private config: CommentConfig;

    constructor(type: CommentType, lines: string[], indentation: Indentation, config: CommentConfig) {
        this.type = type;
        this.lines = lines;
        this.indentation = indentation;
        this.config = config;
    }

    getType(): CommentType {
        return this.type;
    }

    getAvailableCommentTypes(): CommentType[] {
        const types = [CommentType.NO_COMMENT, CommentType.LINE_COMMENT];
        if (this.config.blockStart) {
            types.push(CommentType.BLOCK_COMMENT);
        }
        return types;
    }

    toCommentString(type: CommentType): string {
        switch (type) {
            case CommentType.LINE_COMMENT:
                return this.toLineCommentString(this.lines);
            case CommentType.BLOCK_COMMENT:
                return this.toBlockCommentString(this.lines);
            case CommentType.NO_COMMENT:
                return this.toNoCommentString(this.lines);
        }
    }

    private toBlockCommentString(lines: string[]): string {
        const newLines = [
            this.config.blockStart,
            ...lines.map(line => `${this.config.blockMiddle}${line}`),
            this.config.blockEnd
        ];
        return this.linesToString(newLines);
    }

    private toLineCommentString(lines: string[]): string {
        const newLines = lines.map(line => `${this.config.line}${line}`);
        return this.linesToString(newLines);
    }

    private toNoCommentString(lines: string[]): string {
        return this.linesToString(lines);
    }

    private linesToString(linesToOutput: string[]): string {
        return linesToOutput.map((line, idx) => {
            const indentationToAdd = (idx === 0) ? this.indentation.selectionWhitespaceIndent : this.indentation.nonWhitespaceStartIndent;
            return (indentationToAdd + line).trimEnd();
        }).join('\n');
    }

    /**
     * Parse a Comment object from the current editor selection.
     */
    static async parseCommentFromSelection(editor: vscode.TextEditor): Promise<Comment> {
        const selection = editor.selection;
        const selectionText: string = editor.document.getText(selection);
        const indentation = new Indentation(selectionText, selection);
        const commentConfig = await getCommentConfigForLanguage();
        const extracted = this.extractCommentsHelper(selectionText, commentConfig);

        if (extracted.length === 1) {
            // Found a single block or line comment
            let lines = extracted[0].content.split('\n');
            const commentType = extracted[0].info.type;
            // Formatted multiline block comments will always have a trailing empty line
            if (commentType === CommentType.BLOCK_COMMENT && _.last(lines)?.match(/^\s*$/)) {
                lines = lines.slice(0, -1);
            }
            return new Comment(
                commentType,
                lines,
                indentation,
                commentConfig
            );
        } else {
            // Treat as free text (even though the selection may contain one or more comments)
            const lines = selectionText.split('\n').map((line, idx) => {
                // Normalize indentation
                const indentationToRemove = (idx === 0) ? indentation.selectionWhitespaceIndent : indentation.nonWhitespaceStartIndent;
                return line.replace(indentationToRemove, '');
            });
            return new Comment(
                CommentType.NO_COMMENT,
                lines,
                indentation,
                commentConfig
            );
        }
    }

    private static extractCommentsHelper(selectionText: string, commentConfig: CommentConfig) {
        const extractOptions = {
            pattern: {
                singleLineComment: [{ start: commentConfig.line }],
                multiLineComment: (commentConfig.blockStart) ? [{
                    start: commentConfig.blockStart.trim(),
                    middle: commentConfig.blockMiddle.trim(),
                    end: commentConfig.blockEnd.trim()
                }] : undefined
            }
        };
        const extracted = _.values(extractComments(selectionText, extractOptions));

        // Special case for a group of line comments that has one more more lines with no content: This will appear as multiple comments,
        // but we want to consider it one big comment
        const lineComment = commentConfig.line.trim();
        const emptyLineCommentRegex = new RegExp(`${lineComment}\\s*(\\n${lineComment}\\s*)*`);
        const isSpecialCase = extracted.length >= 2 && _.take(extracted, extracted.length - 1).every(el => {
            return el.info.type === CommentType.LINE_COMMENT && el.code.match(emptyLineCommentRegex);
        });
        if (isSpecialCase) {
            const res = _.tail(extracted).reduce((accumulator, el) => {
                accumulator.content += '\n' + el.content;
                return accumulator;
            }, extracted[0]);
            return [res];
        } else {
            return extracted;
        }
    }
 }

 /**
  * Class to carry information about the indentation of a selection -- both where the selection begins, as well as the first
  * non-whitespace character in the selection.
  */
class Indentation {
    // Absolute column position of selection start
    selectionStartColumn: number;
    selectionStartIndent: string;
    // Number of characters from selection start to the first non-whitespace character
    selectionWhitepsaceLength: number;
    selectionWhitespaceIndent: string;
    // Absolute column position of first non-whitespace character in selection (i.e., sum of previous 2 numbers)
    nonWhitespaceStartColumn: number;
    nonWhitespaceStartIndent: string;

    constructor(selectionText: string, selection: vscode.Selection) {
        this.selectionStartColumn = selection.start.character;
        this.selectionStartIndent = ' '.repeat(this.selectionStartColumn) || '';
        const indexOfFirstNonWhitespaceCharacter = selectionText.search(/[^\s]/);
        this.selectionWhitepsaceLength = (indexOfFirstNonWhitespaceCharacter >= 0) ? indexOfFirstNonWhitespaceCharacter : 0;
        this.selectionWhitespaceIndent = ' '.repeat(this.selectionWhitepsaceLength) || '';
        this.nonWhitespaceStartColumn = this.selectionStartColumn + this.selectionWhitepsaceLength;
        this.nonWhitespaceStartIndent = ' '.repeat(this.nonWhitespaceStartColumn) || '';
    }
 }