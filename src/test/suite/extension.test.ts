import * as assert from 'assert';
import * as vscode from 'vscode';
import * as chai from 'chai';
import { toggleCommentType } from '../../commands/toggleCommentType';
import { openFile } from '../utils/test-utils';

const expect = chai.expect;

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		expect(true).to.be.true;
	});
});
