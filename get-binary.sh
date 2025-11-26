#!/bin/bash

set -e

DEFAULT_VERSION="0.18.1"
VALID_TARGETS=("linux-x86_64" "linux-aarch64" "windows-x86_64" "windows-aarch64" "macos-x86_64" "macos-aarch64")

TARGET="$1"
VERSION="${2:-$DEFAULT_VERSION}"

if [[ ! " ${VALID_TARGETS[*]} " =~ " $TARGET " ]]; then
  echo "Usage: $0 <target> [version]"
  echo "Where <target> is one of: ${VALID_TARGETS[*]}"
  echo "And [version] is the version to download, defaulting to $VERSION"
  exit 1
fi

file_ext=""
if [[ "$TARGET" == windows* ]]; then
  file_ext=".exe"
fi
url="https://github.com/GDQuest/GDScript-formatter/releases/download/$VERSION/gdscript-formatter-$VERSION-$TARGET$file_ext.zip"
echo "Downloading gdscript-formatter version $VERSION for target $TARGET at: $url"

curl -L --output temp.zip $url && \
unzip -o temp.zip -d binaries && \
rm temp.zip && \
mv "binaries/gdscript-formatter-$VERSION-$TARGET$file_ext" "binaries/gdscript-formatter$file_ext"