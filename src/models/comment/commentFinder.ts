import _ from 'lodash';
import vscode from 'vscode';

import { CommentConfig } from '../../configuration';
import { collect, collectFirst, isHighlightedSelection, UserError } from '../../utils';
import { Comment, CommentType } from './comment';

enum ProbeDirection {
    UP = 'up',
    DOWN = 'down',
    NONE = 'none'
}

/**
 * Given the active selection, attempt to probe up and down to find a coherent multi-line comment.
 */
export class CommentFinder {
    private readonly patterns: CommentFinderPattern[];
    private readonly selection: vscode.Selection;

    constructor(private readonly editor: vscode.TextEditor, private readonly config: CommentConfig) {
        this.selection = editor.selection;
        this.patterns = this.getCommentFinderPatterns();
    }

    private getCommentFinderPatterns(): CommentFinderPattern[] {
        const patterns: CommentFinderPattern[] = [new LineCommentPattern(this.editor, this.config)];
        if (this.config.standard.blockStart) {
            patterns.push(new BlockCommentPattern(this.editor, this.config));
        }
        patterns.push(new NoCommentPattern(this.editor, this.config));
        return patterns;
    }

    /**
     * Using the current line as starting point, attempt to parse a comment by probing the lines before/after.
     *
     * NOTE: Will update the active selection with the comment, if found.
     */
    async findAndSelectComment(): Promise<Comment> {
        const comment = collectFirst(this.patterns, pattern => pattern.findAndSelectComment());
        if (!comment) {
            throw new UserError('Could not parse a valid comment encompassing the current line.');
        }
        return comment;
    }
}

/**
 * Base class for finding a specific comment pattern
 */
abstract class CommentFinderPattern {
    protected readonly cursorLine: vscode.TextLine;
    protected readonly isHighlightedSelection: boolean;

    constructor(protected readonly editor: vscode.TextEditor, protected readonly config: CommentConfig) {
        this.cursorLine = this.getLineAt(editor.selection.start.line);
        this.isHighlightedSelection = isHighlightedSelection(editor.selection);
    }

    /**
     * Gets the comment type
     */
    protected abstract getType(): CommentType;

    /**
     * @returns true if the given line satisifies the constraints for a valid multi-line comment of this type.
     * @returns false if the given line does not satisfy the constraints, but this could be the "boundary" of a valid comment.
     * @throws otherwise
     *
     * NOTE: This assumes lines are processed 1 by 1 in ascending or descending order.
     */
    protected abstract matchesLine(line: vscode.TextLine, probeDirection: ProbeDirection): boolean;

    /**
     * @returns a list of line text with any comment-specific characters removed.
     */
    protected abstract getLines(selection: vscode.Selection): string[]

    /**
     * Get the editor's line at the given line index
     */
    protected getLineAt(lineNum: number): vscode.TextLine {
        return this.editor.document.lineAt(lineNum);
    }

    /**
     * @returns true if the given line is part of the active selection
     */
    protected isPartOfActiveSelection(line: vscode.TextLine): boolean {
        const start = this.editor.selection.start.line;
        const end = this.editor.selection.end.line;
        return line.lineNumber >= start && line.lineNumber <= end;
    }

    /**
     * Build a comment line regex from provided regexStr
     *
     * @param regexStr the comment prefix pattern. Note: special characters should already be escaped.
     */
     protected buildRegex(regexStr: string): RegExp {
        return new RegExp(
            `^(?<indentation>\\s*)(?<commentPrefix>${regexStr}) ?(?<content>.*)$`
        );
    }

    /**
     * Get the capture group named `content` using the given regex against the given line
     */
    protected getContent(line: string, regex: RegExp): string {
        // COVERAGE: This function obviously gets hit but the optional chaining makes branch coverage sad
        /* c8 ignore next 5 */
        const content = line.match(regex)?.groups?.content;
        if (content === undefined) {
            // Shouldn't reach here because this won't be called until we've already found a valid comment
            throw new InvalidCommentError();
        }
        return content;
    }

    /**
     * @returns an list of raw line text from the given selection
     */
    protected getRawLines(selection: vscode.Selection): string[] {
        return this.editor.document.getText(selection).split('\n');
    }

    /**
     * This method is called at the end of findAndSelectComment() to validate a good comment was found.
     *
     * @returns true if a valid comment of this type was found
     *
     * NOTE: This should be overridden by classes needing special behavior
     */
    protected isValidComment(): boolean {
        return true;
    }

    /**
     * Returns the selection corresponding to a valid comment which encompasses the active cursor's current line.
     * @throws if a valid comment of this type could not be found
     */
    findAndSelectComment(): Comment {
        // Check current line
        const currentLine = this.getLineAt(this.cursorLine.lineNumber);
        let line = currentLine;
        if (!this.matchesLine(line, ProbeDirection.NONE)) {
            throw new InvalidCommentError();
        }

        // Probe upwards
        let lineNum = this.cursorLine.lineNumber - 1;
        while (lineNum >= 0) {
            const nextLine = this.getLineAt(lineNum);
            if (this.matchesLine(nextLine, ProbeDirection.UP)) {
                line = nextLine;
                lineNum--;
            } else {
                break;
            }
        }
        const startLine = line;

        // Probe downwards
        line = currentLine;
        lineNum = this.cursorLine.lineNumber + 1;
        while (lineNum < this.editor.document.lineCount) {
            const nextLine = this.getLineAt(lineNum);
            if (this.matchesLine(nextLine, ProbeDirection.DOWN)) {
                line = nextLine;
                lineNum++;
            } else {
                break;
            }
        }
        const endLine = line;

        // Final check
        if (!this.isValidComment()) {
            throw new InvalidCommentError();
        }

        const selection = new vscode.Selection(
            startLine.lineNumber,
            0,
            endLine.lineNumber,
            endLine.text.length
        );

        return new Comment(
            selection,
            this.getType(),
            this.getLines(selection),
            this.config,
            startLine.firstNonWhitespaceCharacterIndex
        );
    }
}

class LineCommentPattern extends CommentFinderPattern {
    private readonly regex: RegExp;

    constructor(editor: vscode.TextEditor, config: CommentConfig) {
        super(editor, config);
        this.regex = this.buildRegex(this.config.regex.line);
    }

    protected override getType(): CommentType {
        return CommentType.LINE_COMMENT;
    }

    protected override matchesLine(line: vscode.TextLine, _probeDirection: ProbeDirection): boolean {
        const isMatch = this.regex.test(line.text);
        const isCursor = !this.isHighlightedSelection;
        const lineIsSelected = this.isPartOfActiveSelection(line);

        if (isMatch) {
            return isCursor || lineIsSelected;
        } else {
            if (!isCursor && lineIsSelected) {
                // Can't have a line in the selection that doesn't match
                throw new InvalidCommentError();
            }
            return false;
        }
    }

    protected override getLines(selection: vscode.Selection): string[] {
        return this.getRawLines(selection).map(line => {
            return this.getContent(line, this.regex);
        });
    }
}

class NoCommentPattern extends CommentFinderPattern {

    protected override getType(): CommentType {
        return CommentType.NO_COMMENT;
    }

    protected override matchesLine(line: vscode.TextLine, _probeDirection: ProbeDirection): boolean {
        // If highlighted selection, just match what's highlighted; otherwise match anything except empty line
        return this.isHighlightedSelection ? this.isPartOfActiveSelection(line) : !line.isEmptyOrWhitespace;
    }

    protected override getLines(selection: vscode.Selection): string[] {
        const firstLineIndent = this.getLineAt(selection.start.line).firstNonWhitespaceCharacterIndex;
        const firstLineIndentRegex = new RegExp(`^ {${firstLineIndent}}`);
        return this.getRawLines(selection).map(line => {
            return line.replace(firstLineIndentRegex, '');
        });
    }
}

class BlockCommentPattern extends CommentFinderPattern {
    private static readonly MAX_LINE_COUNT = 150;

    private readonly commentTopRegex: RegExp;
    private readonly commentMiddleRegex: RegExp;
    private readonly commentBottomRegex: RegExp;
    private commentTopLineNum: number | undefined;
    private commentBottomLineNum: number | undefined;
    private lineCount: number;

    constructor(editor: vscode.TextEditor, config: CommentConfig) {
        super(editor, config);
        this.commentTopLineNum = undefined;
        this.commentBottomLineNum = undefined;
        this.lineCount = 0;
        this.commentTopRegex = this.buildRegex(this.config.regex.blockStart);
        this.commentMiddleRegex = this.buildRegex(this.config.regex.blockMiddle);
        this.commentBottomRegex = this.buildRegex(this.config.regex.blockEnd);
    }

    protected override getType(): CommentType {
        return CommentType.BLOCK_COMMENT;
    }

    protected override matchesLine(line: vscode.TextLine, probeDirection: ProbeDirection): boolean {
        const matchesTopPattern = this.commentTopRegex.test(line.text);
        const matchesBottomPattern = this.commentBottomRegex.test(line.text);

        switch (probeDirection) {
            case ProbeDirection.UP:
                if (this.commentTopLineNum) {
                    // We already found the top, stop probing
                    return false;
                } else if (matchesTopPattern) {
                    // We found the top
                    this.commentTopLineNum = line.lineNumber;
                    if (this.isHighlightedSelection && this.commentTopLineNum !== this.editor.selection.start.line) {
                        throw new InvalidCommentError();
                    }
                } else if (matchesBottomPattern) {
                    // Found bottom boundary while probing up--invalid
                    throw new InvalidCommentError();
                }
                break;
            case ProbeDirection.DOWN:
                if (this.commentBottomLineNum) {
                    // We already found the bottom, stop probing
                    return false;
                } else if (matchesBottomPattern) {
                    // We found the bottom
                    this.commentBottomLineNum = line.lineNumber;
                    if (this.isHighlightedSelection && this.commentBottomLineNum !== this.editor.selection.end.line) {
                        throw new InvalidCommentError();
                    }
                } else if (matchesTopPattern) {
                    // Found top boundary while probing down--invalid
                    throw new InvalidCommentError();
                }
                break;
            case ProbeDirection.NONE:
                if (matchesTopPattern) {
                    this.commentTopLineNum = line.lineNumber;
                } else if (matchesBottomPattern) {
                    this.commentBottomLineNum = line.lineNumber;
                }

                // Edge case: If the top and bottom pattern are the same, we're not sure if we've started on top or bottom line
                if (matchesTopPattern && matchesBottomPattern) {
                    if (line.lineNumber === 0 || this.getLineAt(line.lineNumber - 1).isEmptyOrWhitespace) {
                        // Assume we've found the top line
                        this.commentTopLineNum = line.lineNumber;
                        this.commentBottomLineNum = undefined;
                    } else {
                        this.commentTopLineNum = undefined;
                        this.commentBottomLineNum = line.lineNumber;
                    }
                }
                break;
        }

        this.lineCount++;

        // For performance reasons, if we're probing without a selection, enforce a limit
        if (this.lineCount > BlockCommentPattern.MAX_LINE_COUNT && !this.isPartOfActiveSelection(line)) {
            throw new InvalidCommentError();
        }

        return true;
    }

    protected override isValidComment(): boolean {
        return this.commentTopLineNum !== undefined && this.commentBottomLineNum !== undefined;
    }

    protected override getLines(selection: vscode.Selection): string[] {
        const rawLines = this.getRawLines(selection);
        return collect(rawLines, (line, idx) => {
            switch (idx) {
                case 0:
                    return this.getContent(line, this.commentTopRegex) || undefined;
                case rawLines.length - 1:
                    return this.getContent(line, this.commentBottomRegex) || undefined;
                default:
                    return this.getContent(line, this.commentMiddleRegex);
            }
        }, true);
    }
}

class InvalidCommentError extends Error {
    constructor() {
        super('Invalid comment');
    }
}