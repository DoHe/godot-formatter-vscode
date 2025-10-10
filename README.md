# godot-format

A godot/gdscript formatter extension for VSCode. It uses [GDScript-formatter](https://github.com/GDQuest/GDScript-formatter) by GDQuest.

## Features

This is a standard VSCode formatter and as such supports typical formatter capabilities like the format command or autoformatting on save.

## Requirements

This extension ships with the gdscript formatter binary for your specific platform at version `0.14.0` and uses it by default.
If you want to provide your own binary, you can retrieve the one for your platform [here](https://github.com/GDQuest/GDScript-formatter/releases). You can either add it to your system's PATH for autodiscovery or specify the path to the executable in the extension settings (see below). If the binary is added to PATH, make sure to remove the platform and architecture from the filename, e.g. rename `gdscript-formatter-windows-x86_64.exe` to `gdscript-formatter.exe` or `gdscript-formatter-linux-aarch64` to `gdscript-formatter`. Then disable the `useBuiltInBinary` setting.

## Extension Settings

This extension supports the following settings:

- `godotFormatter.enable`: Enable/disable formatting with this extension
- `godotFormatter.useBuiltInBinary`: Whether to use the built-in formatter binary that ships with the extension.
- `godotFormatter.gdscriptFormatterPath`:The path to the gdscript formatter executable. Leave this empty if it's in your system's PATH. If using PATH, make sure to remove the architecture/platform suffix if you copied the binary from the releases page. Only used if useBuiltInBinary is false.
- `godotFormatter.useSpaces`: Whether to use spaces. If disabled will use tabs.
- `godotFormatter.indentSize`: How many spaces to use for indentation. This is only used if `useSpaces` is enabled
- `godotFormatter.reorderCode`:Whether to allow reordering code blocks, like exported variables vs constants etc. This only applies if safe mode is disabled.
- `godotFormatter.safe`: Whether to enable safe mode. Safe mode tries to preserve existing syntax and structure where possible and otherwise does not format the file. If this enabled, `reorderCode` is ignored. Slightly less performant.

## Known Issues

None so far

## Release Notes

See [changelog](https://marketplace.visualstudio.com/items/DoHe.godot-format/changelog)
