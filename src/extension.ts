import * as path from 'node:path';

import * as vscode from 'vscode';
import * as childProcess from "child_process";
import * as os from "os";

const DEFAULT_EXECUTABLE = "gdscript-formatter";
const BUILT_IN_BINARY_PATH = path.join(__dirname, "..", "binaries", DEFAULT_EXECUTABLE);

let outputChannel: vscode.LogOutputChannel;
let diagnosticCollection: vscode.DiagnosticCollection;

function conditionallyAddArgument(args: string[], cmd: string, argName: string, argValue: any = undefined): string {
	if (args.includes(argName)) {
		outputChannel.warn(`Found "${argName}" in "linterArgs", ignoring "linterIgnoredRules"!`);
		return cmd;
	}

	let argString: string;
	if (argValue) {
		argString = `${argName}=${argValue}`;
	} else {
		argString = `${argName}`;
	}

	return `${cmd} ${argString}`;
}


export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel("Godot Formatter", { log: true });
	diagnosticCollection = vscode.languages.createDiagnosticCollection("gdscript-lint");

	outputChannel.info("Godot Formatter extension activated.");

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
	private indentSize: number | null = null;
	private useSpaces: boolean = false;
	private reorderCode: boolean = false;
	private verifyStructure: boolean = false;
	private gdscriptFormatterPath: string = DEFAULT_EXECUTABLE;
	private useBuiltInBinary: boolean = true;
	private maxLineLength: number | null = null;
	private blankLinesAroundDefinitions: number | null = null;
	private continuationIndentLevel: number | null = null;
	private quoteStyle: string = '';
	private args: string[] = [];

	constructor() {
		this.updateConfig();
	}


	updateConfig() {
		const config = vscode.workspace.getConfiguration("godotFormatter");

		this.enabled = config.get<boolean>("enabled", true);
		this.indentSize = config.get<number | null>("indentSize", null);
		this.useSpaces = config.get<boolean>("useSpaces", false);
		this.reorderCode = config.get<boolean>("reorderCode", false);
		this.verifyStructure = config.get<boolean>("verifyStructure", false);
		this.gdscriptFormatterPath = config.get<string>("gdscriptFormatterPath", DEFAULT_EXECUTABLE).trim() || DEFAULT_EXECUTABLE;
		this.useBuiltInBinary = config.get<boolean>("useBuiltInBinary", true);
		this.maxLineLength = config.get<number | null>("maxLineLength", null);
		this.blankLinesAroundDefinitions = config.get<number | null>("blankLinesAroundDefinitions", null);
		this.continuationIndentLevel = config.get<number | null>("continuationIndentLevel", null);
		this.quoteStyle = config.get<string>("quoteStyle", '').trim();
		this.args = config.get<string[]>("args", []);
	}


	provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
		if (!this.enabled) {
			return [];
		}
		return this.callGDScriptFormatter(document) as unknown as vscode.TextEdit[];
	}

	callGDScriptFormatter(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
		return new Promise((resolve, reject) => {
			const cmd = this.getCommand();
			outputChannel.info(`Run format command: '${cmd}' for file '${document.fileName}'`);
			const process = childProcess.exec(
				cmd,
				{
					encoding: "utf8",
					cwd: vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath,
				},
				(err: childProcess.ExecException | null, stdout: string | undefined, _stderr: string | undefined) => {
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
		let cmd = `"${executable}" --stdout`;

		const args = this.args.join(" ");
		cmd += ` ${args}`;

		if (this.indentSize !== null) {
			cmd = conditionallyAddArgument(this.args, cmd, "--indent-size", this.indentSize);
		}

		if (this.maxLineLength !== null) {
			cmd = conditionallyAddArgument(this.args, cmd, "--max-line-length", this.maxLineLength);
		}

		if (this.blankLinesAroundDefinitions !== null) {
			cmd = conditionallyAddArgument(this.args, cmd, "--blank-lines-around-definitions", this.blankLinesAroundDefinitions);
		}

		if (this.continuationIndentLevel !== null) {
			cmd = conditionallyAddArgument(this.args, cmd, "--continuation-indent-level", this.continuationIndentLevel);
		}

		if (this.quoteStyle !== '') {
			cmd = conditionallyAddArgument(this.args, cmd, "--quote-style", this.quoteStyle);
		}

		if (this.useSpaces) {
			cmd = conditionallyAddArgument(this.args, cmd, "--use-spaces");
		}

		if (this.reorderCode) {
			if (this.verifyStructure) {
				outputChannel.warn(`Setting "verifyStructure" is enabled, ignoring "reorderCode"!`);
			} else {
				cmd = conditionallyAddArgument(this.args, cmd, "--reorder-code");
			}
		}

		if (this.verifyStructure) {
			cmd = conditionallyAddArgument(this.args, cmd, "--verify-structure");
		}

		return cmd;
	}
}

class GDScriptLinter {
	private enabled: boolean = true;
	private gdscriptFormatterPath: string = DEFAULT_EXECUTABLE;
	private useBuiltInBinary: boolean = true;
	private maxLineLength: number | null = null;
	private ignoredRules: string = "";
	private linterArgs: string[] = [];

	constructor() {
		this.updateConfig();
	}

	updateConfig() {
		const config = vscode.workspace.getConfiguration("godotFormatter");

		this.enabled = config.get<boolean>("enableLinter", true);
		this.gdscriptFormatterPath = config.get<string>("gdscriptFormatterPath", DEFAULT_EXECUTABLE).trim() || DEFAULT_EXECUTABLE;
		this.useBuiltInBinary = config.get<boolean>("useBuiltInBinary", true);
		this.maxLineLength = config.get<number | null>("linterMaxLineLength", null);
		this.ignoredRules = config.get<string>("linterIgnoredRules", "").trim();
		this.linterArgs = config.get<string[]>("linterArgs", []);
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
			outputChannel.error(`Linting failed for ${document.fileName}: ${error}`);
			// Clear diagnostics on error
			diagnosticCollection.delete(document.uri);
		}
	}

	private runLinter(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
		return new Promise((resolve, reject) => {
			const command = this.getLintCommand(document.fileName);
			outputChannel.info(`Run lint command: '${command}'`);

			childProcess.exec(
				command,
				{
					encoding: "utf8",
					cwd: vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath,
				},
				(err: childProcess.ExecException | null, stdout: string | undefined, stderr: string | undefined) => {
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
		let cmd = `${executable} lint "${fileName}"`;

		const args = this.linterArgs.join(" ");
		cmd += ` ${args}`;

		if (this.maxLineLength !== null) {
			cmd = conditionallyAddArgument(this.linterArgs, cmd, "--max-line-length", this.maxLineLength);
		}

		if (this.ignoredRules) {
			cmd = conditionallyAddArgument(this.linterArgs, cmd, "--disable", this.ignoredRules);
		}

		return cmd;
	}

	private parseLintOutput(output: string | undefined, document: vscode.TextDocument): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		if (!output?.trim()) {
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
	outputChannel.error(`Linting failed: ${error.message}`);
	return error;
}

function handleCommandSuccess(stdout: string | undefined, document: vscode.TextDocument) {
	if (stdout === undefined) {
		outputChannel.error("Formatter returned no output.");
		return [];
	}
	var fullReplace = vscode.TextEdit.replace(
		new vscode.Range(
			new vscode.Position(0, 0),
			new vscode.Position(document.lineCount, document.lineAt(document.lineCount - 1).text.length)
		),
		stdout
	);
	return [fullReplace];
}
