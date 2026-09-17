# Roadmap

What this project is becoming: **one control in the harness header that runs whatever project you
have open**, whichever ecosystem it belongs to.

Ordering here is intent, not a promise. Issues labelled `good first issue` are the fastest way in;
adapter work is deliberately the easiest kind of contribution ([docs/adapters.md](docs/adapters.md)).

## Next

- **Python adapter** — `pyproject.toml` (PEP 621 scripts), `manage.py` targets, `Makefile` recipes,
  `uv`/`poetry` entry points.
- **Make adapter** — targets from `Makefile`/`GNUmakefile`, `.PHONY` honoured.
- **Docker Compose adapter** — `docker compose up -d <service>` per service, with a down action.
- **Command reordering** — choose which command is the default without running it first.

## Later

- **Cargo / Go / Taskfile adapters** — the same seam, one file each.
- **Run output panel** — follow a command's output inside the harness instead of a tail in a tooltip.
- **Health check per command** — mark a command *ready* when a port answers or a URL responds, so the
  button can say "running" with confidence rather than "started".
- **Profiles per project** — groups of commands (e.g. "backend", "frontend") with a single start.
- **Command arguments** — prompt for the variables a command needs instead of hard-coding them in the
  command text.

## Not planned

- **Detecting environments by guessing.** No heuristics that run the project to find out what it is;
  adapters read declared metadata only.
- **Replacing a terminal.** This runs the project's own commands; interactive shells, TUIs, and
  long-lived REPLs stay in the harness's terminal surfaces.
- **A build step.** The browser half is served as authored, so installing stays one command. See
  [docs/architecture.md](docs/architecture.md#why-the-browser-half-is-not-built).
- **Dependencies.** The zero-dependency property is what keeps installation and CI trivial; a proposal
  to add one needs to argue why the harness or Node cannot already do it.
