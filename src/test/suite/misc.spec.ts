import { expect } from 'chai';
import sinon from 'sinon';
import vscode from 'vscode';

import {
    invokeDependencyCommand,
    DependencyCommand,
    clearActivatedExtensionsCache,
} from '../../commands/dependencyCommand';
import * as configuration from '../../configuration';
import * as miscUtils from '../../utils';

/**
 * Collection of miscellaneous tests not well-enough covered by core tests.
 */
describe('Misc', () => {
    afterEach(async () => {
        sinon.restore();
    });

    describe('utils.ts', () => {
        describe('collect', () => {
            it('Basic usage', async () => {
                const arr = [{ num: 3 }, { num: -4 }, { num: -5 }];
                const res = miscUtils.collect(arr, (el) => (el.num < 0 ? el.num * -1 : undefined));
                expect(res).to.deep.equal([4, 5]);
            });

            it('No transformations are defined', async () => {
                const arr = [{ num: 3 }, { num: -4 }, { num: -5 }];
                const res = miscUtils.collect(arr, (el) => (el.num > 999 ? el.num * -1 : undefined));
                expect(res).to.deep.equal([]);
            });

            it('Other falsy values are distinct from undefined', async () => {
                const arr = [{ val: null }, { val: '' }, { val: 0 }, { val: false }, { val: undefined }];
                const res = miscUtils.collect(arr, (el) => el.val);
                expect(res).to.deep.equal([null, '', 0, false]);
            });

            describe('haltOnError flag', () => {
                const arr = [{ num: 3 }, { num: -4 }];
                // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
                const collectFn = (haltOnError: boolean) => {
                    return miscUtils.collect(
                        arr,
                        (el) => {
                            if (el.num >= 0) {
                                return el.num * 2;
                            } else {
                                throw new Error('whoops');
                            }
                        },
                        haltOnError
                    );
                };

                it('is false (default) - error should be swallowed and relevant element filtered out', async () => {
                    expect(collectFn(false)).to.deep.equal([6]);
                });

                it('is true - error should propagate', async () => {
                    expect(() => collectFn(true)).to.throw('whoops');
                });
            });
        });

        describe('collectFirst', () => {
            it('Basic usage', async () => {
                const arr = [{ num: 3 }, { num: -4 }, { num: -5 }];
                const res = miscUtils.collectFirst(arr, (el) => (el.num < 0 ? el.num * -1 : undefined));
                expect(res).to.equal(4);
            });

            it('No transformations are defined', async () => {
                const arr = [{ num: 3 }, { num: -4 }, { num: -5 }];
                const res = miscUtils.collectFirst(arr, (el) => (el.num > 999 ? el.num * -1 : undefined));
                expect(res).to.be.undefined;
            });
        });
    });

    describe('configuration.ts', () => {
        describe('getConfig', () => {
            it('Gets a configuration item', async () => {
                const quoteChars = configuration.getConfig<string[]>(configuration.QUOTE_CHARS);
                expect(quoteChars).to.deep.equal([`"`, `'`, '`']);
            });

            it('Error when config value is not defined', async () => {
                expect(() => configuration.getConfig<string[]>('mystery_property')).to.throw(
                    'No value found for the configuration key mystery_property'
                );
            });
        });

        describe('getLanguageConfigurationJson', () => {
            it('Success', async () => {
                const config = await configuration.getLanguageConfigurationJson('ruby');
                expect(config.comments).to.deep.equal({
                    lineComment: '#',
                    blockComment: ['=begin', '=end'],
                });
            });

            it('Language configuration file not found -- results in the javascript config', async () => {
                sinon
                    .stub(vscode.extensions, 'getExtension')
                    .onFirstCall()
                    .returns({
                        packageJSON: {
                            contributes: {
                                languages: [{ id: 'not_python' }],
                            },
                        },
                    } as vscode.Extension<unknown>)
                    .callThrough();
                const config = await configuration.getLanguageConfigurationJson('python');
                expect(config.comments).to.deep.equal({
                    lineComment: '//',
                    blockComment: ['/*', '*/'],
                });
            });
        });
    });

    describe('dependencyCommand.ts', () => {
        describe('invokeDependencyCommand', () => {
            afterEach(() => clearActivatedExtensionsCache());

            it('Invoke rewrap.rewrapComment', async () => {
                const stubbedExtension = vscode.extensions.getExtension('vscode.python');
                sinon.stub(vscode.extensions, 'getExtension').withArgs('stkb.rewrap').returns(stubbedExtension);
                const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand').resolves('blah');
                expect(await invokeDependencyCommand(DependencyCommand.REWRAP_COMMENT, 'because reasons')).to.equal(
                    'blah'
                );
                expect(executeCommandStub).to.be.calledOnceWithExactly(DependencyCommand.REWRAP_COMMENT);
            });
        });
    });
});
