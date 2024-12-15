import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function initializeLogging(channel: vscode.OutputChannel) {
    outputChannel = channel;
}

export function logPrompt(prompt: string, type: 'system' | 'user' | 'assistant' = 'system') {
    if (!outputChannel) {
        return;
    }

    outputChannel.appendLine(`\n[${type.toUpperCase()} PROMPT] ${new Date().toISOString()}`);
    outputChannel.appendLine('----------------------------------------');
    outputChannel.appendLine(prompt);
    outputChannel.appendLine('----------------------------------------\n');
}
