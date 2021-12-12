import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob-promise';


/**
 * NOTE: Be sure to run tests with --disable-extensions flag set
 */

export async function run(): Promise<void> {
	// Create the mocha instance
	const mocha = new Mocha({
		ui: 'bdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '..');
	// Mocha needs to run on the transpiled .js files, not .ts
	const files = await glob('**/**.spec.js', { cwd: testsRoot });

	// Add files to the test suite
	files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

	// Run the tests
	await new Promise((resolve, reject) => {
		mocha.run(failures => {
			if (failures > 0) {
				reject(new Error(`${failures} tests failed.`));
			} else {
				resolve(null);
			}
		});
	});
}
