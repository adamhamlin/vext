import * as vscode from 'vscode';
import * as _ from 'lodash';
import { EXTENSION_NAME } from '../commands';
import { getCurrentLang, parseJsonStripComments, UserError } from '../utils';
import { basename } from 'path';

type IndividualCommentConfig = {
    line: string,
    blockStart: string,
    blockMiddle: string,
    blockEnd: string
};

export type CommentConfig = {
    standard: IndividualCommentConfig;
    display: IndividualCommentConfig;
    regex: IndividualCommentConfig;
};

type LanguageConfiguration = {
    comments: {
        blockComment: string[];
        lineComment: string;
    }
};

// Supported configuration properties
export const AUTO_FORMAT_ON_COMMENT_TOGGLE = 'autoFormatOnToggleCommentType';
export const QUOTE_CHARS = 'quoteChars';
export const CASE_EXTRA_WORD_CHARS = 'caseExtraWordChars';
export const VARIABLE_NAMING_FORMATS = 'variableNamingFormats';
export const USE_DOUBLE_QUOTES_FOR_OUTPUT_STRINGS = 'useDoubleQuotesForOutputStrings';

/**
 * Get any configuration setting for the specified key (defaults to Vext configuration).
 */
export function getConfig<T>(key: string, configurationName = EXTENSION_NAME): T {
    const configValue: T | undefined = vscode.workspace.getConfiguration(configurationName).get(key);
    if (_.isUndefined(configValue)) {
        throw new UserError(`No value found for the configuration key ${key}.`);
    }
    return _.cloneDeep(configValue);
}

/**
 * Get the CommentConfig for the current editor language.
 */
export async function getCommentConfigForLanguage(): Promise<CommentConfig> {
    const language = getCurrentLang();
    const cachedConfig = languageToCommentConfigCache[language];
    if (cachedConfig) {
        return cachedConfig;
    }
    const commentConfig = (await getLanguageConfigurationJson()).comments;
    const blockComment = commentConfig.blockComment || ['', ''];
    // We'll special case the /* ... */ block style to make it look nice
    const isJavaScriptStyle = blockComment[0] === '/*';

    const res = {
        standard: {
            line: commentConfig.lineComment,
            blockStart: blockComment[0],
            blockMiddle: '',
            blockEnd: blockComment[1]
        },
        display: {
            line: commentConfig.lineComment + ' ',
            blockStart: isJavaScriptStyle ? '/**' : blockComment[0],
            blockMiddle: isJavaScriptStyle ? ' * ' : '',
            blockEnd: isJavaScriptStyle ? ' */' : blockComment[1]
        },
        regex: {
            line: _.escapeRegExp(commentConfig.lineComment),
            blockStart: isJavaScriptStyle ? `${_.escapeRegExp('/**')}?` : _.escapeRegExp(blockComment[0]),
            blockMiddle: isJavaScriptStyle ? `${_.escapeRegExp('*')}?` : '',
            blockEnd: isJavaScriptStyle ? _.escapeRegExp('*/') : _.escapeRegExp(blockComment[1])
        }
    };
    languageToCommentConfigCache[language] = res;
    return res;
}

/**
 * Returns true if the auto-format setting is enabled.
 *
 * NOTE: We won't auto-format if the current language is plaintext because Rewrap handles that weirdly/unexpectedly.
 */
export function shouldAutoFormat(): boolean {
    return getConfig<boolean>(AUTO_FORMAT_ON_COMMENT_TOGGLE) && getCurrentLang() !== 'plaintext';
}

async function getLanguageConfigurationJson(language: string = getCurrentLang()): Promise<LanguageConfiguration> {
    // Languages are represented as extensions
    const languageExtensionName = `vscode.${language}`;
    try {
        const extension = vscode.extensions.getExtension(languageExtensionName);
        if (!extension) {
            throw new Error(`Could not find extension '${languageExtensionName}'`);
        }
        const extensionUri = extension.extensionUri;
        const configurationFilePath = _.get(_.find(extension.packageJSON.contributes.languages, lang => lang.id === language), 'configuration');
        if (!configurationFilePath) {
            throw new Error(`Could not find a configuration file for ${language}`);
        }
        // The configurationFilePath is something like './blah-language-configuration.json', so we only want basename
        const configFileUri = vscode.Uri.joinPath(extensionUri, basename(configurationFilePath));
        const configFileText = (await vscode.workspace.fs.readFile(configFileUri)).toString();
        return parseJsonStripComments<LanguageConfiguration>(configFileText);
    } catch (err) {
        vscode.window.showWarningMessage(`Unable to load configuration for language '${language}': ${(err as Error).message}. Falling back to javascript-style comments.`);
        return getLanguageConfigurationJson('javascript');
    }
}

const languageToCommentConfigCache: Record<string, CommentConfig> = {};