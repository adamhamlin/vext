import { expect } from 'chai';
import dedent from 'dedent';
import _ from 'lodash';
import vscode from 'vscode';

import { toggleVariableNamingFormat } from '../../commands/toggleVariableNamingFormat';
import { getConfig } from '../../configuration';
import { VARIABLE_NAMING_FORMATS } from '../../configuration/configuration.constants';
import { EXTENSION_NAME } from '../../constants';
import {
    openEditorWithContent,
    openEditorWithContentAndSelectAll,
    openEditorWithContentAndSetCursor,
} from '../utils/test-utils';

describe('toggleVariableNamingFormat cycles the naming format of a word', () => {
    before(async () => {
        // Let's test all the supported formats
        await vscode.workspace
            .getConfiguration(EXTENSION_NAME)
            .update(VARIABLE_NAMING_FORMATS, ['camel', 'pascal', 'snake', 'snakeUpper', 'kebab', 'kebabUpper']);
    });

    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    it('basic usage', async () => {
        const editor = await openEditorWithContentAndSetCursor(
            'javascript',
            `const someIDVariable45 = 14;`,
            `const someIDVari`.length
        );
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(
            // NOTE: We've lost the original capitalization of "ID", but nothing we can really do...
            `const SomeIdVariable45 = 14;`
        );
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(`const some_id_variable_45 = 14;`);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(`const SOME_ID_VARIABLE_45 = 14;`);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(`const some-id-variable-45 = 14;`);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(`const SOME-ID-VARIABLE-45 = 14;`);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(`const someIdVariable45 = 14;`);
    });

    it('ambiguous format just toggles between camel and pascal', async () => {
        const editor = await openEditorWithContentAndSetCursor('javascript', `const blah = 14;`, `const bl`.length);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(`const Blah = 14;`);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(`const blah = 14;`);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(`const Blah = 14;`);
    });

    it('multiple cursors - all selections use casing of first selection', async () => {
        const editor = await openEditorWithContent(
            'javascript',
            dedent`
            EXOTIC_BUTTERS
            exoticButters
            exotic-butters
            ExoticButters
            EXOTIC-BUTTERS
            exotic_butters
        `
        );
        for (const _iter of _.times(5)) {
            await vscode.commands.executeCommand('editor.action.insertCursorBelow');
        }
        // All lines should be toggled to the same new quote character
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(dedent`
            exotic-butters
            exotic-butters
            exotic-butters
            exotic-butters
            exotic-butters
            exotic-butters
        `);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(dedent`
            EXOTIC-BUTTERS
            EXOTIC-BUTTERS
            EXOTIC-BUTTERS
            EXOTIC-BUTTERS
            EXOTIC-BUTTERS
            EXOTIC-BUTTERS
        `);
        await toggleVariableNamingFormat(editor);
        expect(editor.document.getText()).to.equal(dedent`
            exoticButters
            exoticButters
            exoticButters
            exoticButters
            exoticButters
            exoticButters
        `);
    });

    it('error when cursor is not inside of word', async () => {
        const editor = await openEditorWithContentAndSetCursor(
            'javascript',
            'const msg = "Two spaces?  Not gonna work.";',
            'const msg = "Two spaces? '.length
        );
        await expect(toggleVariableNamingFormat(editor)).to.be.rejectedWith('Cursor must be located within a word!');
    });

    it('error when cursor word does not match any format', async () => {
        const editor = await openEditorWithContentAndSetCursor(
            'javascript',
            'const Some_Weird-Casing = "bad"',
            'const Some_W'.length
        );
        await expect(toggleVariableNamingFormat(editor)).to.be.rejectedWith(
            'Current word does not match any expected variable naming format!'
        );
    });

    it('error when multi-line selection', async () => {
        const editor = await openEditorWithContentAndSelectAll(
            'typescript',
            dedent`
            var1
            var2
        `
        );
        await expect(toggleVariableNamingFormat(editor)).to.be.rejectedWith(
            'Cannot process multi-line selection! However, multi-line cursors are supported.'
        );
    });

    describe('variableNamingFormats configuration', async () => {
        let origVariableNamingFormats: string[];

        before(async () => {
            origVariableNamingFormats = getConfig(VARIABLE_NAMING_FORMATS);
        });

        after(async () => {
            await vscode.workspace
                .getConfiguration(EXTENSION_NAME)
                .update(VARIABLE_NAMING_FORMATS, origVariableNamingFormats);
        });

        it('unconfigured naming formats are not used', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                `const myVariable = 45`,
                `const myVar`.length
            );
            await vscode.workspace.getConfiguration(EXTENSION_NAME).update(VARIABLE_NAMING_FORMATS, ['snake', 'camel']);
            await toggleVariableNamingFormat(editor);
            expect(editor.document.getText()).to.equal(`const my_variable = 45`);
            await toggleVariableNamingFormat(editor);
            expect(editor.document.getText()).to.equal(`const myVariable = 45`);
        });

        it('invalid naming format specified', async () => {
            const editor = await openEditorWithContentAndSetCursor(
                'javascript',
                'const msg = "this is a simple string";',
                'const msg = "this '.length
            );
            await vscode.workspace.getConfiguration(EXTENSION_NAME).update(VARIABLE_NAMING_FORMATS, ['camel', 'zebra']);
            await expect(toggleVariableNamingFormat(editor)).to.be.rejectedWith(
                `Variable naming format 'zebra' is not supported!`
            );
        });
    });
});
