import JSON5 from 'json5';
import _ from 'lodash';
import vscode from 'vscode';
import YAML from 'yaml';

import { getConfig } from '../configuration';
import { USE_DOUBLE_QUOTES_FOR_OUTPUT_STRINGS } from '../configuration/configuration.constants';
import { JsonObjectOrArray } from '../types';
import {
    collectFirst,
    handleError,
    isHighlightedSelection,
    isMultiLineSelection,
    parseJsonStripComments,
    rotate,
    UserError,
} from '../utils';

export const TOGGLE_JSON_TO_JS_TO_YAML_CMD = 'toggleJsonToJsToYaml';

/**
 * Toggle selection between JSON and the javascript equivalent using unquoted keys where possible.
 *
 * @param editor the vscode TextEditor object
 */
export async function toggleJsonToJsToYaml(editor: vscode.TextEditor): Promise<void> {
    await handleError(async () => {
        const useDoubleQuotesForOutputStrings = getConfig<boolean>(USE_DOUBLE_QUOTES_FOR_OUTPUT_STRINGS);
        const usageError = new UserError(
            'Must select a valid JSON, Javascript, or YAML object/array! Javascript may not contain expressions.'
        );

        if (editor.selections.length !== 1) {
            throw usageError;
        }

        const selection = editor.selections[0];
        if (!isHighlightedSelection(selection)) {
            throw usageError;
        }

        const options = { useDoubleQuotesForOutputStrings };

        const formatters = [
            new JsonFormatter(editor, selection, options),
            new JavascriptFormatter(editor, selection, options),
            new YamlFormatter(editor, selection, options),
        ];

        // Find the first formatter than can parse the text and then the next formatter that can stringify it
        const replacementText = collectFirst(formatters, (formatter, idx) => {
            if (formatter.mayParse()) {
                try {
                    const obj = formatter.parse();
                    const stringifyFormatters = rotate(formatters, idx).slice(1); // slice to remove current formatter
                    return collectFirst(stringifyFormatters, (stringifier) => {
                        if (stringifier.mayStringify(obj)) {
                            return stringifier.stringify(obj);
                        }
                    });
                } catch (err) {
                    // swallow and move on
                }
            }
        });

        // TODO: preserve indentation?

        if (!replacementText) {
            throw usageError;
        }

        await editor.edit((builder) => {
            builder.replace(selection, replacementText);
        });
    });
}

interface SerializationFormatOptions {
    useDoubleQuotesForOutputStrings: boolean;
}

abstract class SerializationFormatter {
    protected readonly text: string;
    protected readonly firstLine: vscode.TextLine;
    protected readonly tabSize: number | undefined;
    protected readonly isMultiLineSelection: boolean;
    protected readonly looksLikeJsonObjectOrArray: boolean;
    protected readonly indent: number;

    constructor(
        protected readonly editor: vscode.TextEditor,
        protected readonly selection: vscode.Selection,
        protected readonly options: SerializationFormatOptions
    ) {
        this.text = editor.document.getText(this.selection);
        this.isMultiLineSelection = isMultiLineSelection(this.selection);
        this.firstLine = editor.document.lineAt(this.selection.start.line);
        /* c8 ignore next */
        const editorTabSize = +(vscode.window.activeTextEditor?.options.tabSize || 4);
        this.tabSize = this.isMultiLineSelection ? editorTabSize : undefined;
        this.looksLikeJsonObjectOrArray = [
            ['{', '}'],
            ['[', ']'],
        ].some(([open, close]) => _.startsWith(this.text, open) && _.endsWith(this.text, close));
        this.indent = this.computeIndentation();
    }

    abstract mayParse(): boolean;
    abstract parse(): JsonObjectOrArray;
    mayStringify(_input: JsonObjectOrArray): boolean {
        return true;
    }
    protected abstract doStringify(input: JsonObjectOrArray): string;
    /*final*/ stringify(input: JsonObjectOrArray): string {
        const str = this.doStringify(input);
        return this.addIndent(str);
    }

    protected addIndent(text: string): string {
        if (this.indent) {
            return text.split('\n').join(`\n${' '.repeat(this.indent)}`);
        } else {
            return text;
        }
    }

    protected computeIndentation(): number {
        return this.isMultiLineSelection ? this.firstLine.firstNonWhitespaceCharacterIndex : 0;
    }
}

class JsonFormatter extends SerializationFormatter {
    override mayParse(): boolean {
        return this.looksLikeJsonObjectOrArray;
    }
    override parse(): JsonObjectOrArray {
        return parseJsonStripComments(this.text);
    }
    override doStringify(input: JsonObjectOrArray): string {
        return JSON.stringify(input, null, this.tabSize);
    }
}

class JavascriptFormatter extends SerializationFormatter {
    override mayParse(): boolean {
        return this.looksLikeJsonObjectOrArray;
    }
    override parse(): JsonObjectOrArray {
        return JSON5.parse(this.text);
    }
    override doStringify(input: JsonObjectOrArray): string {
        return JSON5.stringify(input, {
            quote: this.options.useDoubleQuotesForOutputStrings ? `"` : `'`,
            space: this.tabSize,
            omitTrailingCommas: true,
            singleLinePadding: true,
        });
    }
}

class YamlFormatter extends SerializationFormatter {
    override mayParse(): boolean {
        return this.isMultiLineSelection;
    }
    override parse(): JsonObjectOrArray {
        const str = this.removeIndent(this.text);
        return YAML.parse(str);
    }
    override mayStringify(_input: JsonObjectOrArray): boolean {
        return (
            this.isMultiLineSelection &&
            this.firstLine.firstNonWhitespaceCharacterIndex === this.selection.start.character
        );
    }
    override doStringify(input: JsonObjectOrArray): string {
        const str = YAML.stringify(input, {
            indent: this.tabSize,
            singleQuote: !this.options.useDoubleQuotesForOutputStrings,
        });
        // Remove trailing newline
        return str.trimEnd();
    }
    override computeIndentation(): number {
        return this.selection.start.character;
    }
    private removeIndent(text: string): string {
        const regex = new RegExp(`^${' '.repeat(this.indent)}`);
        return text
            .split('\n')
            .map((line) => line.replace(regex, ''))
            .join('\n');
    }
}
