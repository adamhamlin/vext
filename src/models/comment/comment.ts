import _ from 'lodash';
import vscode from 'vscode';

import { CommentConfig, getCommentConfigForLanguage } from '../../configuration';
import { CommentFinder } from './commentFinder';

export enum CommentType {
    BLOCK_COMMENT = 'multiline',
    LINE_COMMENT = 'singleline',
    NO_COMMENT = 'none',
}

/**
 * Abstraction for a comment
 */
export class Comment {
    private readonly indentation: string;

    constructor(
        public readonly selection: vscode.Selection,
        private readonly type: CommentType,
        private readonly lines: string[],
        private readonly config: CommentConfig,
        indentationSize: number
    ) {
        this.indentation = _.repeat(' ', indentationSize);
    }

    getType(): CommentType {
        return this.type;
    }

    getAvailableCommentTypes(): CommentType[] {
        const types = [CommentType.NO_COMMENT, CommentType.LINE_COMMENT];
        if (this.config.standard.blockStart) {
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
            this.config.display.blockStart,
            ...lines.map((line) => `${this.config.display.blockMiddle}${line}`),
            this.config.display.blockEnd,
        ];
        return this.linesToString(newLines);
    }

    private toLineCommentString(lines: string[]): string {
        const newLines = lines.map((line) => `${this.config.display.line}${line}`);
        return this.linesToString(newLines);
    }

    private toNoCommentString(lines: string[]): string {
        return this.linesToString(lines);
    }

    private linesToString(linesToOutput: string[]): string {
        return linesToOutput.map((line) => (this.indentation + line).trimEnd()).join('\n');
    }

    /**
     * Parse a Comment object from the current editor selection.
     */
    static async parseCommentFromSelection(editor: vscode.TextEditor): Promise<Comment> {
        const commentConfig = await getCommentConfigForLanguage();
        const commentFinder = new CommentFinder(editor, commentConfig);
        return commentFinder.findAndSelectComment();
    }
}
