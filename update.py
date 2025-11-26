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
    from argparse import ArgumentParser

    parser = ArgumentParser(
        description="Update versions for the extension and formatter."
    )
    parser.add_argument(
        "gdscript_formatter_version", type=str, help="New gdscript-formatter version"
    )
    parser.add_argument(
        "upgrade_impact",
        type=str,
        default="patch",
        help="Impact of the upgrade: major, minor, or patch (default: patch)",
        choices=["major", "minor", "patch"],
        nargs="?",
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="Force update even if the formatter version is the same",
    )

    args = parser.parse_args()

    new_formatter_version = args.gdscript_formatter_version
    upgrade_impact = args.upgrade_impact
    force_update = args.force

    extension_version, formatter_version = get_current_versions()
    new_extension_version = update_extension_version(extension_version, upgrade_impact)

    if new_formatter_version == formatter_version and not force_update:
        print("No update needed. The formatter version is the same.")
        sys.exit(0)

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
