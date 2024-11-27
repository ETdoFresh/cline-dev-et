import * as vscode from "vscode"

export interface TerminalInfo {
	terminal: vscode.Terminal
	busy: boolean
	lastCommand: string
	id: number
}

// Extend the TerminalOptions type to include shellIntegration
declare module 'vscode' {
    interface TerminalOptions {
        shellIntegration?: {
            enabled?: boolean
            decorationsEnabled?: boolean
        }
    }
}

// Although vscode.window.terminals provides a list of all open terminals, there's no way to know whether they're busy or not (exitStatus does not provide useful information for most commands). In order to prevent creating too many terminals, we need to keep track of terminals through the life of the extension, as well as session specific terminals for the life of a task (to get latest unretrieved output).
// Since we have promises keeping track of terminal processes, we get the added benefit of keep track of busy terminals even after a task is closed.
export class TerminalRegistry {
	private static terminals: TerminalInfo[] = []
	private static nextTerminalId = 1

	static createTerminal(cwd?: string | vscode.Uri | undefined): TerminalInfo {
		// Create terminal with explicit shell integration settings
		const options: vscode.TerminalOptions = {
			cwd,
			name: "Cline",
			iconPath: new vscode.ThemeIcon("robot")
		}

		// Set shell path for macOS
		if (process.platform === 'darwin') {
			options.shellPath = '/bin/zsh'
		}

		// Create the terminal with the configured options
		const terminal = vscode.window.createTerminal(options)

		// Show the terminal to ensure proper initialization
		terminal.show(false) // false means don't focus the terminal

		const newInfo: TerminalInfo = {
			terminal,
			busy: false,
			lastCommand: "",
			id: this.nextTerminalId++,
		}
		this.terminals.push(newInfo)
		return newInfo
	}

	static getTerminal(id: number): TerminalInfo | undefined {
		const terminalInfo = this.terminals.find((t) => t.id === id)
		if (terminalInfo && this.isTerminalClosed(terminalInfo.terminal)) {
			this.removeTerminal(id)
			return undefined
		}
		return terminalInfo
	}

	static updateTerminal(id: number, updates: Partial<TerminalInfo>) {
		const terminal = this.getTerminal(id)
		if (terminal) {
			Object.assign(terminal, updates)
		}
	}

	static removeTerminal(id: number) {
		const terminal = this.terminals.find(t => t.id === id)
		if (terminal) {
			try {
				// Attempt to dispose the terminal properly
				terminal.terminal.dispose()
			} catch (error) {
				console.error(`Error disposing terminal ${id}:`, error)
			}
		}
		this.terminals = this.terminals.filter((t) => t.id !== id)
	}

	static getAllTerminals(): TerminalInfo[] {
		// Clean up closed terminals
		const closedTerminals = this.terminals.filter((t) => this.isTerminalClosed(t.terminal))
		closedTerminals.forEach(t => this.removeTerminal(t.id))
		
		return this.terminals
	}

	// The exit status of the terminal will be undefined while the terminal is active. (This value is set when onDidCloseTerminal is fired.)
	private static isTerminalClosed(terminal: vscode.Terminal): boolean {
		return terminal.exitStatus !== undefined
	}
}
