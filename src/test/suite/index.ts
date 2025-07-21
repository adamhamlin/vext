import path from 'path';

import { glob } from 'glob';
import Mocha from 'mocha';

import { mochaHooks } from '../mocha.setup';

/**
 * NOTE: Be sure to run tests with --disable-extensions flag set
 */

export async function run(): Promise<void> {
    // Create the mocha instance
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
        timeout: 6000,
        rootHooks: mochaHooks,
    });

    const testsRoot = path.resolve(__dirname, '..');
    // Mocha needs to run on the transpiled .js files, not .ts
    const files = await glob('**/**.spec.js', { cwd: testsRoot });

    // Add files to the test suite
    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    // Run the tests
    await new Promise((resolve, reject) => {
        mocha.run((failureCount) => {
            if (failureCount > 0) {
                reject(new Error(`${failureCount} tests failed.`));
            } else {
                resolve(null);
            }
        });
    });
}
