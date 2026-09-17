# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.9] - 2026-09-17

### Changed

- **The `default` pill is grey at rest.** The primitive paints itself with layer-2, which is
  near-white and left the badge almost invisible on the menu surface. It now wears the interactive
  grey at rest, and inverts to layer-2 while the row itself turns grey under the pointer, so it reads
  as a marker in both states.

## [0.2.8] - 2026-09-17

### Changed

- **The default row lost its filled highlight.** The `default` pill is what marks it, so opening the
  menu no longer looks like one row is stuck under the pointer.
- **The pill is tighter**: 18px tall with 6px of side padding and a 10px label, instead of the
  primitive's 24px and 8px, so it reads as a marker rather than a button.

## [0.2.7] - 2026-09-17

### Added

- **The default command says so in the menu.** Its row carries a `default` pill, so which command the
  play button runs is visible without running anything or remembering. The pill keeps its width and
  the name is the part that gives way: a long command truncates with an ellipsis instead of squeezing
  the badge out of the row.

## [0.2.6] - 2026-09-17

### Changed

- **Deleting a user-defined command moved onto the row it belongs to.** The **Manage** section no
  longer carries a "Delete a custom command" submenu: a user-defined command's own options offer
  **Delete**, in red, beside **Set as default** and **Edit**. Detected commands have no Delete — they
  belong to their manifest and are hidden instead.
- **The row options carry icons** (a check, a pencil, a trash can), and **Edit** lost its trailing
  ellipsis, which said nothing the icon does not.

### Fixed

- The row options no longer depend on the command list staying open: they dismiss themselves on Escape
  and on a pointer outside them, so a pointer *inside* them can never tear them down before the click
  that picks an option lands.

## [0.2.5] - 2026-09-17

### Changed

- **Selected and focused states are drawn at a weight you can see.** A hairline border renders as a
  single translucent device pixel on a 1x display, which reads as a rendering fault rather than a
  state. The selected icon in the picker now carries a double ring, a focused input field doubles its
  border with an inset ring, every control this plugin owns draws a 2px focus ring, and the failure
  dress is 2px like the rest. Nothing moves when a state changes: the rings are shadows, not wider
  borders.

## [0.2.4] - 2026-09-17

### Fixed

- **A row's options work under a physical mouse.** The options menu is portaled to the document body,
  which makes it "outside" the command list — and the list dismisses itself on `pointerdown`, which
  fires *before* the `click` that would pick an option. The menu was therefore torn down mid-gesture:
  "Edit…" did nothing at all with a real mouse, while every scripted click worked, because
  `element.click()` never sends a `pointerdown`. The option items now stop the pointer event, so the
  list stays open and the click lands. Verification now uses the full real gesture sequence; the
  checklist in [CONTRIBUTING.md](CONTRIBUTING.md#verifying-a-ui-change) explains how.

## [0.2.3] - 2026-09-17

### Added

- **The menu names the build it is running.** `GET /commands` carries the plugin version and the menu
  footer shows it, so "which bundle is this tab on?" — a real question, because the client half is
  served from a revision computed when the harness boots — is answered by looking at the control.

### Fixed

- **A dialog now closes the command list when it opens.** The list stayed open behind the editor,
  which put it at the same z-index junction as the modal (the menu sits at 100, the dialog's own
  layer at 1) and left the dialog dependent on never overlapping the list. Dialogs dismiss the menu
  they were called from, as every other dialog in the harness does; the row options still stack
  without closing anything, which is what they are for.

## [0.2.2] - 2026-09-17

### Fixed

- **A double click on "Edit…" (or on "Add command…") no longer swallows the dialog.** The second
  click of the gesture landed on the mask of the dialog that had just appeared and dismissed it in
  the same breath, which read as "the dialog does not open". A dialog now ignores closes for 300 ms
  after it opens — the mask, Escape, and Cancel all behave normally from then on — so the gesture
  that opens a dialog can never be the gesture that closes it.

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

[Unreleased]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.9...HEAD
[0.2.9]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/albertgranados/dsh-run-environment/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/albertgranados/dsh-run-environment/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/albertgranados/dsh-run-environment/releases/tag/v0.1.0
