import * as path from 'node:path';

import * as vscode from 'vscode';
import * as childProcess from "child_process";
import * as os from "os";

const DEFAULT_EXECUTABLE = "gdscript-formatter";
const BUILT_IN_BINARY_PATH = path.join(__dirname, "..", "binaries", DEFAULT_EXECUTABLE);

let outputChannel: vscode.OutputChannel;


export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel("Godot Formatter");
	const formatter = new GDScriptFormatter();

	vscode.workspace.onDidChangeConfiguration(event => {
		let affected = event.affectsConfiguration("godotFormatter");
		if (!affected) {
			return;
		}
		formatter.updateConfig();
	});

	const subscription = vscode.languages.registerDocumentFormattingEditProvider("gdscript", formatter);
	context.subscriptions.push(subscription);
}

export function deactivate() { }


class GDScriptFormatter implements vscode.DocumentFormattingEditProvider {
	private enabled: boolean = true;
	private indentSize: number = 4;
	private useSpaces: boolean = false;
	private reorderCode: boolean = false;
	private safe: boolean = false;
	private gdscriptFormatterPath: string = DEFAULT_EXECUTABLE;
	private useBuiltInBinary: boolean = true;

	constructor() {
		this.updateConfig();
	}


	updateConfig() {
		const config = vscode.workspace.getConfiguration("godotFormatter");
		this.enabled = config.get<boolean>("enableFormatter", true);
		this.indentSize = config.get<number>("indentSize", 4);
		this.useSpaces = config.get<boolean>("useSpaces", false);
		this.reorderCode = config.get<boolean>("reorderCode", false);
		this.safe = config.get<boolean>("safe", true);
		this.gdscriptFormatterPath = config.get<string>("gdscriptFormatterPath", DEFAULT_EXECUTABLE).trim() || DEFAULT_EXECUTABLE;
		this.useBuiltInBinary = config.get<boolean>("useBuiltInBinary", true);
	}


	provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
		if (!this.enabled) {
			return [];
		}
		return this.callGDScriptFormatter(document) as unknown as vscode.TextEdit[];
	}

	callGDScriptFormatter(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
		return new Promise((resolve, reject) => {
			const process = childProcess.exec(
				this.getCommand(),
				{ encoding: "utf8" },
				(err, stdout, _) => {
					if (err) {
						reject(handleCommandError(err));
						return;
					}
					resolve(handleCommandSuccess(stdout, document));
				}
			);
			process.stdin?.write(document.getText());
			process.stdin?.end(os.EOL);
		});
	}

	getCommand(): string {
		let executable = BUILT_IN_BINARY_PATH;
		if (!this.useBuiltInBinary) {
			executable = this.gdscriptFormatterPath;
		}
		let cmd = `${executable} --indent-size=${this.indentSize}`;
		if (this.useSpaces) {
			cmd += " --use-spaces";
		}
		if (this.reorderCode && !this.safe) {
			cmd += " --reorder-code";
		}
		if (this.safe) {
			cmd += " --safe";
		}
		return cmd;
	}
}

function handleCommandError(err: childProcess.ExecException): Error {
	const error = new Error(`Command: ${err.cmd}, Code: ${err.code}, Error: ${err.message}`);
	outputChannel.appendLine(`Linting failed: ${error.message}`);
	return error;
}

function handleCommandSuccess(stdout: string, document: vscode.TextDocument) {
	var fullReplace = vscode.TextEdit.replace(
		new vscode.Range(
			new vscode.Position(0, 0),
			new vscode.Position(document.lineCount, document.lineAt(document.lineCount - 1).text.length)
		),
		stdout
	);
	return [fullReplace];
}