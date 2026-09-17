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

then restart the harness and reload the browser page. The script installs the package with `file:`
(copied into the profile) rather than linking it — a linked package resolves its own imports from the
checkout, where the harness packages it needs do not exist. Re-run it after every edit.

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
