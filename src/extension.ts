import * as vscode from 'vscode';
import * as childProcess from "child_process";
import * as os from "os";

const DEFAULT_EXECUTABLE = "gdscript-formatter";

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
	private gdscriptFormatterPath: string = DEFAULT_EXECUTABLE;

	constructor() {
		this.updateConfig();
	}


	updateConfig() {
		const config = vscode.workspace.getConfiguration("godotFormatter");
		this.enabled = config.get<boolean>("enableFormatter", true);
		this.indentSize = config.get<number>("indentSize", 4);
		this.useSpaces = config.get<boolean>("useSpaces", false);
		this.reorderCode = config.get<boolean>("reorderCode", false);
		this.gdscriptFormatterPath = config.get<string>("gdscriptFormatterPath", DEFAULT_EXECUTABLE).trim() || DEFAULT_EXECUTABLE;
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
						const error = handleCommandError(err);
						outputChannel.appendLine(`Linting failed: ${error.message}`);
						reject(error);
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
		let executable = this.gdscriptFormatterPath;
		let cmd = `${executable} --indent-size=${this.indentSize}`;
		if (this.useSpaces) {
			cmd += " --use-spaces";
		}
		if (this.reorderCode) {
			cmd += " --reorder-code";
		}
		return cmd;
	}
}

function handleCommandError(err: childProcess.ExecException): Error {
	return new Error(`Command: ${err.cmd}, Code: ${err.code}, Error: ${err.message}`);
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