import vscode from 'vscode';

import { UserWarning } from '../utils';

export enum DependencyExtension {
    VS_CODE_INTERNAL = 'vsCodeInternal',
    REWRAP = 'rewrap'
}

const DependencyExtensionIdMap = {
    [DependencyExtension.VS_CODE_INTERNAL]: 'vscode',
    [DependencyExtension.REWRAP]: 'stkb.rewrap'
};

const activatedExtensions: Set<DependencyExtension> = new Set([DependencyExtension.VS_CODE_INTERNAL]);

export enum DependencyCommand {
    REWRAP_COMMENT = 'rewrap.rewrapComment'
}

const CommandToExtensionMap = {
    [DependencyCommand.REWRAP_COMMENT]: DependencyExtension.REWRAP
};

/**
 * Invoke a command from another extension or a built-in VS Code command.
 *
 * @param cmd the name of the command to execute.
 * @param explanation (optional) message snippet explaining what this command is needed for if it cannot be executed.
 */
export async function invokeDependencyCommand<T>(cmd: DependencyCommand, explanation: string = ''): Promise<T | undefined> {
    const extensionName = CommandToExtensionMap[cmd];
    await ensureExtensionActivated(extensionName, explanation);
    return vscode.commands.executeCommand(cmd);
}

/**
 * Clear activated extensions cache. For testing only.
 */
export function clearActivatedExtensionsCache() {
    activatedExtensions.clear();
}

/**
 * Ensure the extension with the given name exists and has been activated.
 *
 * @param extensionName the extension to activate.
 * @param explanation message snippet explaining what this extension is needed for if it cannot be activated.
 * @throws UserError when the extension is not found or cannot be activated.
 */
async function ensureExtensionActivated(extensionName: DependencyExtension, explanation: string): Promise<void> {
    if (!activatedExtensions.has(extensionName)) {
        const extensionId = DependencyExtensionIdMap[extensionName];
        const extension = vscode.extensions.getExtension(extensionId);
        try {
            if (!extension) {
                throw new Error(`Extension '${extensionId}' not found!`);
            }
            await extension.activate();
            activatedExtensions.add(extensionName);
        } catch (e) {
            const err = e as Error;
            const msgPrefix = `Extension '${extensionName}' (${extensionId}) is required ${explanation}`.trimEnd();
            throw new UserWarning(`${msgPrefix}. Please ensure it has been properly installed/enabled: ${err.message}`);
        }
    }
}