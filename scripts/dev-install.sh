#!/usr/bin/env sh
#
# Install this checkout into a harness profile the way a user would install it
# from a registry or from GitHub: as a real package inside the profile.
#
# `dsh plugin add <directory>` links the source tree instead, and a linked
# package resolves its own imports from the checkout, where the harness packages
# (`@deepseek-ai/schemastery`, `@deepseek-ai/dsh-home-paths`, …) do not exist.
# `file:` copies the package into the profile's node_modules, so the development
# loop is: edit, run this script, restart the harness.
#
# usage: scripts/dev-install.sh [profile]
#
set -eu

PROFILE="${1:-web}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"

dsh plugin --profile "$PROFILE" add "file:$HERE"

echo
echo "Installed from $HERE into profile $PROFILE."
echo "Restart the harness, then reload the browser page."
