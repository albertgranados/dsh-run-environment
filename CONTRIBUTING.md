# Contributing

Thanks for taking the time. This project is small on purpose, and the rules below are what keep it
that way.

## Getting set up

```sh
git clone https://github.com/albertgranados/dsh-run-environment
cd dsh-run-environment
npm test
```

There is **nothing to install**: no runtime dependencies, no dev dependencies, no build step. If
`npm test` does not pass on a fresh clone, that is a bug worth reporting.

To run your checkout inside a harness:

```sh
scripts/dev-install.sh          # or: scripts/dev-install.sh <profile>
```

then restart the harness and reload the browser page. Re-run it after every edit.

Two details that make the script less naive than it looks, and that you will hit if you install by
hand:

- `dsh plugin add <directory>` **links** the source tree, and a linked package resolves its own
  imports from the checkout — where the harness packages it needs (`@deepseek-ai/schemastery`, …) do
  not exist. The script uses `file:`, which **copies** the package into the profile.
- That copy is made of hard links, and `pnpm` trusts its lockfile entry, so a plain re-`add` will not
  pick up an edit — particularly one made by an editor that replaces files atomically. The script
  removes the installed directory first to force the copy.

## How work lands

Trunk-based development: `main` is always releasable, and work happens on short-lived branches.

```
main ──●────────────●────────────●────►   one squashed commit per change
        \          /   \        /
         ●──●──●──●     ●──●──●            feat/…, fix/…, docs/…, chore/…
```

1. Branch from `main`: `feat/make-adapter`, `fix/hidden-default`, `docs/adapter-example`.
2. Keep commits small and focused. Rebase rather than merge `main` back in.
3. Open a pull request. The CI workflow runs `npm test` on Node 20, 22, and 24.
4. A change lands when tests pass and review is happy; keep pull requests to one idea.

### Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), in English, imperative mood:

```
feat(adapters): detect Makefile targets
fix(runner): keep a stopped command out of the failure window
docs(architecture): explain why the browser half is not built
```

The type is one of `feat`, `fix`, `docs`, `test`, `refactor`, `chore`. A breaking change gets a `!`
and a `BREAKING CHANGE:` footer.

## What a change needs

- **Tests.** Host behaviour is tested with `node:test` against real temporary directories and fake
  seams; see `test/runner.test.js` for the process pattern and `test/router.test.js` for HTTP.
  A new adapter without tests will not be merged.
- **English.** Code, comments, documentation, commit messages, and issue text.
- **JSDoc on anything exported**, in the style of the surrounding code: what it does, what it takes,
  what it returns, and what it throws. The harness renders these as the plugin's public surface.
- **No new dependencies** without a discussion first. The zero-dependency property is a feature:
  it keeps installation to one command and the test suite offline.
- **A `CHANGELOG.md` entry** under `## Unreleased`.

### Verifying a UI change

Scripted browser checks are worth having, but **a synthetic click is not a click**. `element.click()`
skips hit-testing and, more importantly, skips the `pointerdown` the harness menus listen for on
`document` to dismiss themselves — which is exactly how a portaled menu can be torn down between the
press and the release, leaving a control that works in a test and does nothing under a mouse.

A real gesture is this sequence, dispatched on `document.elementFromPoint(x, y)` rather than on the
element you believe you are clicking:

```
pointerover, pointerenter, pointermove, pointerdown, mousedown, pointerup, mouseup, click
```

Re-check by hand after touching the header control: a single click, a **double** click, a click on the
dialog's mask, `Escape`, and Cancel. Each of those found a real bug at least once.

## Style

- ES modules, two-space indentation, single quotes, semicolons. Match the file you are editing.
- Prefer small pure functions with explicit inputs over ambient state. `core/model.js` is the model
  to imitate: no I/O, no globals, exhaustively tested.
- Comment the *why*, not the *what*. If a line needs a comment to explain what it does, rename
  something instead.
- Error messages are for a stranger at 2 a.m.: say what was expected, what arrived, and what to do.
- Keep the browser half thin. If a decision can live on the host, it belongs there — that is what
  makes it testable.

## Adding an environment

The most valuable contribution this project can receive. Read [docs/adapters.md](docs/adapters.md):
an adapter is one file, one registration line, one test file, and a README table row.

## Reporting a bug

Use the issue template. A useful report has: what you ran, what you expected, what happened, your
`node --version`, the harness version (`dsh --version`), and — when the control misbehaves — the
output of `dsh --profile web --dump-config | grep -A3 run-environment`.

Security-sensitive reports go through [SECURITY.md](SECURITY.md) instead of the public tracker.

## Code of conduct

Participation is covered by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Be decent; the maintainer will
enforce it.

## License

By contributing you agree that your work is licensed under the [MIT License](LICENSE).
