# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-09-17

### Fixed

- **The command list no longer closes when a row's options open.** The three-dot menu stacks next to
  the row it belongs to, so choosing options never loses sight of the list; closing either closes
  both.
- **Section headings always name the source.** A group of detected commands is titled by the file
  that declared them, and a host that cannot name that file falls back to the adapter id — the
  generic "Detected" heading is gone from the dictionaries entirely.

## [0.2.0] - 2026-09-17

### Added

- **Per-command icons** — every command in the menu carries an icon; the default is a neutral
  asterisk, and the add/edit dialogs offer a validated picker. The icon set is owned by the host and
  served to the browser at `GET /commands`.
- **Rename a command** — the row options offer **Edit…**, which renames any command and, for a
  user-defined one, also edits its command line. Detected commands keep the command line their
  manifest declares; only the displayed name and icon are overridable, and restoring the adapter's
  label drops the override.
- **Per-row options** — each command row ends in a three-dot handle opening **Set as default** and
  **Edit…**, so both actions are reachable without running the command first.
- **Manifest-grouped menu** — detected commands are grouped under the file that declared them
  (`package.json`, `Makefile`, …) instead of a generic "Detected" heading. Adapters declare this with
  the new `manifest` field of a detected command.

## [0.1.0] - 2026-09-17

First release: the concept, the architecture, and the Node.js adapter.

### Added

- **Session-header run control** — a split button in `conversation.session.header.utilities` that runs
  the current project's default command, with a menu listing every command the project offers.
- **Adapter architecture** — environments are detected by independent adapters with a documented
  contract ([docs/adapters.md](docs/adapters.md)); adapters are isolated, so one failing detector
  never hides another's commands.
- **Node.js adapter (`node-npm`)** — `package.json` scripts as `npm run <script>` commands, ranked so
  `dev` wins over `start` over manifest order, with npm lifecycle companions (`pre<name>`,
  `post<name>`) kept out of the menu.
- **User-defined commands** — add, run, and delete project-specific commands from the menu; they run
  through the user's shell in the project directory.
- **Hide and restore** — detected commands can be hidden from the menu and restored from
  **Manage → Show hidden**.
- **Run control** — the button becomes a stop button while a command is alive; stopping terminates the
  whole process group, not just the parent.
- **Failure surfacing** — a command that exits non-zero shortly after launch paints the control red
  and carries the last line of its output in the tooltip.
- **Per-project preferences** — default command, hidden commands, and user-defined commands stored
  under `$DSH_HOME/dsh-run-environment/projects.json`, with atomic writes, corruption quarantine, and
  least-recently-used pruning.
- **HTTP API** behind the harness trust fence: `GET /commands`, `POST /run`, `POST /stop`,
  `POST /state`, `GET /log`.
- **Configuration** — `visibility`, `maxConcurrentRuns`, `collectBytes`, `spillBytes`, `graceMs`,
  `failureWindowMs`, `shell`, `stateFile`
  ([docs/configuration.md](docs/configuration.md)).
- **61 tests** with `node:test`, no dependencies, offline, covering the model, the workspace layer,
  the registry, the store, the runner, the HTTP surface, and the client bundle contract.

[Unreleased]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/albertgranados/dsh-run-environment/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/albertgranados/dsh-run-environment/releases/tag/v0.1.0
