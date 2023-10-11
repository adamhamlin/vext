import { expect } from 'chai';
import dedent from 'dedent';
import _ from 'lodash';
import vscode from 'vscode';

import { toggleNewlineChars } from '../../commands/toggleNewlineChars';
import { openEditorWithContent, openEditorWithContentAndSelectAll } from '../utils/test-utils';

describe('toggleNewlineChars cycles between newlines and literal newline characters', () => {
    afterEach(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    it('basic usage', async () => {
        const editor = await openEditorWithContentAndSelectAll(
            'javascript',
            dedent`
                Code under testing
                Validation brings comfort
                Errors, now exposed
            `
        );
        await toggleNewlineChars(editor);
        expect(editor.document.getText()).to.equal(
            'Code under testing\\nValidation brings comfort\\nErrors, now exposed'
        );
        await toggleNewlineChars(editor);
        expect(editor.document.getText()).to.equal(dedent`
            Code under testing
            Validation brings comfort
            Errors, now exposed
        `);
    });

    it('error when no text selected', async () => {
        const editor = await openEditorWithContent(
            'javascript',
            dedent`
                Code under testing
                Validation brings comfort
                Errors, now exposed
            `
        );
        await expect(toggleNewlineChars(editor)).to.be.rejectedWith('Must select a section of text!');
    });
});
