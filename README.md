# godot-format

A godot/gdscript formatter extension for VSCode. It uses [GDScript-formatter](https://github.com/GDQuest/GDScript-formatter) by GDQuest.

## Features

This is a standard VSCode formatter and as such supports typical formatter capabilities like the format command or autoformatting on save.

## Requirements

This extension does not ship with the gdscript formatter binaries themselves. You can retrieve them [here](https://github.com/GDQuest/GDScript-formatter/releases). You can either add them to your system's PATH for autodiscovery or specify the path to the executable in the extension settings (see below).

## Extension Settings

This extension supports the following settings:

- `godotFormatter.enable`: Enable/disable this extension
- `godotFormatter.gdscriptFormatterPath`: The path to the gdscript formatter executable. Leave this empty if it's in your system's PATH
- `godotFormatter.useSpaces`: Whether to use spaces. If disabled will use tabs.
- `godotFormatter.indentSize`: How many spaces to use for indentation. This is only used if `useSpaces` is enabled
- `godotFormatter.reorderCode`: Whether to allow reordering code chunks, like exported variables vs constants etc

## Known Issues

None so far

## Release Notes

### 0.0.3

Update visuals for extension store

### 0.0.2

Update extension store metadata

### 0.0.1

Initial test release of Godot Format
