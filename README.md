# godot-format

A godot/gdscript formatter and linter extension for VSCode. It uses [GDScript-formatter](https://github.com/GDQuest/GDScript-formatter) by GDQuest.

## Features

This extension provides:

- **Formatting**: Standard VSCode formatter capabilities including format command and autoformatting on save
- **Linting**: Highlights style and convention issues in your GDScript files

The linter runs automatically when you save a file and displays warnings and errors inline with your code.

## Requirements

This extension ships with the gdscript formatter binary for your specific platform at version `0.18.1` and uses it by default.
If you want to provide your own binary, you can retrieve the one for your platform [here](https://github.com/GDQuest/GDScript-formatter/releases). You can either add it to your system's PATH for autodiscovery or specify the path to the executable in the extension settings (see below). If the binary is added to PATH, make sure to remove the version tag, platform and architecture from the filename, e.g. rename `gdscript-formatter-0.17.0-windows-x86_64.exe` to `gdscript-formatter.exe` or `gdscript-formatter-0.17.0-linux-aarch64` to `gdscript-formatter`. Then disable the `useBuiltInBinary` setting.

## Extension Settings

This extension supports the following settings:

- `godotFormatter.enable`: Enable/disable formatting with this extension
- `godotFormatter.useBuiltInBinary`: Whether to use the built-in formatter binary that ships with the extension.
- `godotFormatter.gdscriptFormatterPath`:The path to the gdscript formatter executable. Leave this empty if it's in your system's PATH. If using PATH, make sure to remove the architecture/platform suffix if you copied the binary from the releases page. Only used if useBuiltInBinary is false.
- `godotFormatter.useSpaces`: Whether to use spaces. If disabled will use tabs.
- `godotFormatter.indentSize`: How many spaces to use for indentation. This is only used if `useSpaces` is enabled
- `godotFormatter.reorderCode`:Whether to allow reordering code blocks, like exported variables vs constants etc. This only applies if safe mode is disabled.
- `godotFormatter.safe`: Whether to enable safe mode. Safe mode tries to preserve existing syntax and structure where possible and otherwise does not format the file. If this enabled, `reorderCode` is ignored. Slightly less performant.
- `godotFormatter.enableLinter`: Enable/disable linting with this extension
- `godotFormatter.linterMaxLineLength`: Configure the maximum line length for the liner. Default: 100.
- `godotFormatter.linterIgnoredRules`: Comma-separated list of rules to ignore.
  - [See the GDScript-formatter README](https://github.com/GDQuest/GDScript-formatter) for a full list of rules
  - _NOTE:_ Rules can also be ignored with a `# gdlint-ignore-next-line (rules)` above a line or `# gdlint-ignore (rules)` next to a line.

## Known Issues

None so far

## Release Notes

See [changelog](https://marketplace.visualstudio.com/items/DoHe.godot-format/changelog)

## Testing locally

1. Run `get-binary.sh (architecture)`
   - [See versions here](https://github.com/GDQuest/GDScript-formatter/releases)
   - Supported architectures:
     - `linux-x86_64`
     - `linux-aarch64`
     - `windows-x86_64`
     - `windows-aarch64`
     - `macos-x86_64`
     - `macos-aarch64`
   - This places the binary at `binaries/gdscript-formatter`
2. Run `npm install`
3. Run `npx @vscode/vsce package`
   - This will generate a `.vsix` file at the root of this project
   - Install the `.vsix` from the VSCode extension menu

Alternatively if you are using VSCode for development you can run the extension in debug mode from VSCode's built-in "Run and Debug" dialog.
