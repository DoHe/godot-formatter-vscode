import * as path from 'node:path';

import * as vscode from 'vscode';
import * as childProcess from "child_process";
import * as os from "os";

const DEFAULT_EXECUTABLE = "gdscript-formatter";
const BUILT_IN_BINARY_PATH = path.join(__dirname, "..", "binaries", DEFAULT_EXECUTABLE);

let outputChannel: vscode.OutputChannel;
let diagnosticCollection: vscode.DiagnosticCollection;


export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel("Godot Formatter");
	diagnosticCollection = vscode.languages.createDiagnosticCollection("gdscript-lint");

	const formatter = new GDScriptFormatter();
	const linter = new GDScriptLinter();

	vscode.workspace.onDidChangeConfiguration(event => {
		let affected = event.affectsConfiguration("godotFormatter");
		if (!affected) {
			return;
		}
		formatter.updateConfig();
		linter.updateConfig();
	});

	// Register formatter
	const formatterSubscription = vscode.languages.registerDocumentFormattingEditProvider("gdscript", formatter);
	context.subscriptions.push(formatterSubscription);

	// Register linter on save
	const lintSubscription = vscode.workspace.onDidSaveTextDocument(document => {
		if (document.languageId === "gdscript") {
			linter.lintDocument(document);
		}
	});
	context.subscriptions.push(lintSubscription);

	// Also lint when document is opened
	const openSubscription = vscode.workspace.onDidOpenTextDocument(document => {
		if (document.languageId === "gdscript") {
			linter.lintDocument(document);
		}
	});
	context.subscriptions.push(openSubscription);

	// Clear diagnostics when document is closed
	const closeSubscription = vscode.workspace.onDidCloseTextDocument(document => {
		if (document.languageId === "gdscript") {
			diagnosticCollection.delete(document.uri);
		}
	});
	context.subscriptions.push(closeSubscription);

	context.subscriptions.push(diagnosticCollection);
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
		this.enabled = config.get<boolean>("enabled", true);
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
		let cmd = `"${executable}" --indent-size=${this.indentSize}`;
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

class GDScriptLinter {
	private enabled: boolean = true;
	private gdscriptFormatterPath: string = DEFAULT_EXECUTABLE;
	private useBuiltInBinary: boolean = true;
	private maxLineLength: number = 100;
	private ignoredRules: string = "";

	constructor() {
		this.updateConfig();
	}

	updateConfig() {
		const config = vscode.workspace.getConfiguration("godotFormatter");
		this.enabled = config.get<boolean>("enableLinter", true);
		this.gdscriptFormatterPath = config.get<string>("gdscriptFormatterPath", DEFAULT_EXECUTABLE).trim() || DEFAULT_EXECUTABLE;
		this.useBuiltInBinary = config.get<boolean>("useBuiltInBinary", true);
		this.maxLineLength = config.get<number>("linterMaxLineLength", 100);
		this.ignoredRules = config.get<string>("linterIgnoredRules", "").trim();
	}

	async lintDocument(document: vscode.TextDocument) {
		if (!this.enabled) {
			diagnosticCollection.delete(document.uri);
			return;
		}

		try {
			const diagnostics = await this.runLinter(document);
			diagnosticCollection.set(document.uri, diagnostics);
		} catch (error) {
			outputChannel.appendLine(`Linting failed for ${document.fileName}: ${error}`);
			// Clear diagnostics on error
			diagnosticCollection.delete(document.uri);
		}
	}

	private runLinter(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
		return new Promise((resolve, reject) => {
			const command = this.getLintCommand(document.fileName);

			childProcess.exec(command, { encoding: "utf8" }, (err, stdout, stderr) => {
				if (err && err.code !== 1) {
					// Code 1 is expected when there are lint issues, other codes are actual errors
					reject(new Error(`Linter command failed: ${err.message}`));
					return;
				}

				const diagnostics = this.parseLintOutput(stdout, document);
				resolve(diagnostics);
			});
		});
	}

	private getLintCommand(fileName: string): string {
		let executable = BUILT_IN_BINARY_PATH;
		if (!this.useBuiltInBinary) {
			executable = this.gdscriptFormatterPath;
		}

		let command = `${executable} lint "${fileName}" --max-line-length ${this.maxLineLength}`;

		if (this.ignoredRules) {
			command += ` --disable ${this.ignoredRules}`;
		}

		return command;
	}

	private parseLintOutput(output: string, document: vscode.TextDocument): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		if (!output.trim()) {
			return diagnostics;
		}

		const lines = output.trim().split("\n");

		for (const line of lines) {
			// Parse format: file:line:lint:severity(error|warning): message
			const match = line.match(/^(.+?):(\d+):([^:]+):(error|warning):\s*(.+)$/);

			if (match) {
				const [, , lineStr, lintType, severity, message] = match;
				const lineNumber = parseInt(lineStr, 10) - 1; // VS Code uses 0-based line numbers

				if (lineNumber >= 0 && lineNumber < document.lineCount) {
					const range = new vscode.Range(
						new vscode.Position(lineNumber, 0),
						new vscode.Position(lineNumber, document.lineAt(lineNumber).text.length)
					);

					const diagnostic = new vscode.Diagnostic(
						range,
						`[${lintType}] ${message}`,
						severity === "error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
					);

					diagnostic.source = "gdscript-formatter";
					diagnostic.code = lintType;

					diagnostics.push(diagnostic);
				}
			}
		}

		return diagnostics;
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