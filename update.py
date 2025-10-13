#!/usr/bin/env python3

import json
import re
from datetime import datetime
from typing import Tuple


def update_package_json(extension_version: str, formatter_version: str):
    file_path = "package.json"
    with open(file_path, "r") as file:
        data = json.load(file)

    data["version"] = extension_version
    data["gdscript_formatter_version"] = formatter_version

    with open(file_path, "w") as file:
        json.dump(data, file, indent=2)


def update_readme(formatter_version: str):
    _update_with_regex(
        "README.md",
        r"version `[\d\.]+`",
        f"version `{formatter_version}`",
    )


def get_current_versions() -> Tuple[str, str]:
    with open("package.json", "r") as file:
        data = json.load(file)
    return data["version"], data["gdscript_formatter_version"]


def update_get_binary_script(formatter_version: str):
    _update_with_regex(
        "get-binary.sh",
        r"DEFAULT_VERSION=\"[\d\.]+\"",
        f'DEFAULT_VERSION="{formatter_version}"',
    )


def _update_with_regex(file_path: str, pattern: str, replacement: str):
    with open(file_path, "r") as file:
        content = file.read()

    updated_content = re.sub(pattern, replacement, content)

    with open(file_path, "w") as file:
        file.write(updated_content)


def update_changelog(
    extension_version: str, formatter_version: str, formatter_updated: bool
):
    file_path = "CHANGELOG.md"
    with open(file_path, "r") as file:
        content_lines = file.readlines()

    new_entries = [
        "\n",
        f"## [{extension_version}] - {datetime.now().strftime('%Y-%m-%d')}",
        "\n",
        "\n",
    ]
    if formatter_updated:
        new_entries.extend(
            [
                "### Updated",
                "\n",
                "\n",
                f"- Update to gdscript-formatter version {formatter_version}",
                "\n",
            ]
        )
    content_lines = content_lines[:3] + new_entries + content_lines[3:]

    with open(file_path, "w") as file:
        file.writelines(content_lines)


def update_extension_version(current_version: str, impact: str) -> str:
    major, minor, patch = current_version.split(".")
    if impact == "major":
        major = str(int(major) + 1)
        minor = "0"
        patch = "0"
    elif impact == "minor":
        minor = str(int(minor) + 1)
        patch = "0"
    elif impact == "patch":
        patch = str(int(patch) + 1)
    return f"{major}.{minor}.{patch}"


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python update.py <gdscript_formatter_version> (<upgrade_impact>)")
        sys.exit(1)

    new_formatter_version = sys.argv[1]
    upgrade_impact = "patch"
    if len(sys.argv) > 2:
        upgrade_impact = sys.argv[2]
        if upgrade_impact not in ["major", "minor", "patch"]:
            print("Invalid upgrade impact. Use 'major', 'minor', or 'patch'.")
            sys.exit(1)

    extension_version, formatter_version = get_current_versions()
    new_extension_version = update_extension_version(extension_version, upgrade_impact)

    update_package_json(new_extension_version, new_formatter_version)
    update_readme(new_formatter_version)
    update_get_binary_script(new_formatter_version)
    update_changelog(
        new_extension_version,
        new_formatter_version,
        new_formatter_version != formatter_version,
    )

    print("Run the following commands:")
    print("git add .")
    print(
        f"git commit -m 'Update to gdscript-formatter version {new_formatter_version}'"
    )
    print("git push")
    print(
        f"git tag v{new_extension_version} -m 'Publish version {new_extension_version}'"
    )
    print(f"git push origin v{new_extension_version}")
