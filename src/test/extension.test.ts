import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Format file with # fmt:off does not append extra blank lines', async () => {
		const ext = vscode.extensions.getExtension('DoHe.godot-format');
		assert.ok(ext, 'Extension should be found');
		await ext.activate();

		const filePath = path.join(__dirname, '../../src/test/fmt_off.gd');
		const document = await vscode.workspace.openTextDocument(filePath);
		await vscode.languages.setTextDocumentLanguage(document, 'gdscript');

		const originalText = document.getText();

		const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
			'vscode.executeFormatDocumentProvider',
			document.uri,
			{ insertSpaces: false, tabSize: 4 }
		);

		if (edits && edits.length > 0) {
			assert.strictEqual(edits[0].newText, originalText, 'Formatted output should match original text');
		} else {
			assert.deepStrictEqual(edits, [], 'No edits should be required when document is already formatted');
		}
	});
});
