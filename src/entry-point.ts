import * as vscode from 'vscode';
import { registerAllCommands } from './commands';

// THIS IS THE EXTENSION ENTRY POINT

/**
 * This method is called when the extension is activated, which occurs the first time a command is executed.
 */
export function activate(context: vscode.ExtensionContext): void {
	registerAllCommands(context);
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate(): void {
	// No-op
}
