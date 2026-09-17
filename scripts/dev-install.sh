#!/usr/bin/env sh
#
# Install this checkout into a harness profile the way a user would install it
# from a registry or from GitHub: as a real package inside the profile.
#
# Two things about `dsh plugin add` make the naive version of this script wrong:
#
#  1. `dsh plugin add <directory>` links the source tree, and a linked package
#     resolves its own imports from the checkout, where the harness packages
#     (`@deepseek-ai/schemastery`, …) do not exist. `file:` copies instead.
#  2. That copy is made of hard links, so an editor that replaces a file
#     atomically (write-then-rename) leaves the installed copy pointing at the
#     old inode — and pnpm trusts its lockfile entry, so a plain re-`add` will
#     not re-copy it. Removing the installed directory first is what forces it.
#
# usage: scripts/dev-install.sh [profile]
#
set -eu

PROFILE="${1:-web}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
NAME="$(node -p "require('$HERE/package.json').name")"
TARGET="${DSH_HOME:-$HOME/.dsh}/profiles/$PROFILE/node_modules/$NAME"

rm -rf "$TARGET"
dsh plugin --profile "$PROFILE" add "file:$HERE"

echo
echo "Installed $NAME into profile $PROFILE from $HERE."
echo "Restart the harness, then reload the browser page."
