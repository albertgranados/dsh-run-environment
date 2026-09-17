# Architecture

The plugin is one Node half and one browser half, joined by five HTTP operations and a very small
model. This document explains the layering, the flow of one click, and the decisions that are not
obvious from the code.

## The shape

```
┌──────────────────────────── browser half (lib/client.js) ────────────────────────────┐
│  Session-header split button · command menu · "add command" dialog                    │
│  Owns: rendering, local pending/error state, polling while something is running.       │
└───────────────────────────────────────┬──────────────────────────────────────────────┘
                                        │  JSON over /run-environment/*
┌───────────────────────────────────────▼──────────────────────────────────────────────┐
│  core/router.js — one prefix route, five operations, request validation, trust fence  │
├──────────────────┬─────────────────────┬──────────────────────┬──────────────────────┤
│ core/registry.js │ core/project-store.js│ core/runner.js       │ core/model.js         │
│ adapters detect  │ preferences persist  │ processes run/stop    │ merge, rank, default  │
├──────────────────┴─────────────────────┴──────────────────────┴──────────────────────┤
│  adapters/*.js — one module per environment, pure detection, no side effects           │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

`lib/index.js` is wiring only: it registers the built-in adapters, builds the store and the runner
from the validated config, and registers the route. Nothing else lives there, so reading it tells you
the whole composition of the plugin.

## Why the model lives on the host

The browser half never decides what exists or what a click means. It sends a **command id** and
renders what comes back. Three things fall out of that:

1. **The wire never carries a program to execute.** `POST /run` accepts `{ cwd, id }`; the host
   resolves `id` against the model it built from the workspace. A caller cannot ask the host to spawn
   something the project does not declare — which matters because an agent can call the same API the
   button does (see [SECURITY.md](../SECURITY.md)).
2. **The rules are testable without a browser.** Ranking, defaults, hiding, and the custom-command
   lifecycle are pure functions in `core/model.js`, covered directly by `test/model.test.js`.
3. **One source of truth.** The default shown on the button and the default a keyboard-driven run
   would use cannot drift, because both come from the same field.

## Flow of one click

```
click ▸ POST /run {cwd, id}
  ├─ connection.requestRejection(req)        harness Host/Origin fence + login cookie
  ├─ openWorkspace(cwd)                      absolute, existing directory (404 otherwise)
  ├─ registry.detect(workspace)              every adapter, cached until a watched file changes
  ├─ store.read(directory)                   this project's preferences
  ├─ buildCommands({detected, state})        rank, hide, append custom commands
  ├─ find(id)                                unknown or hidden id → 404 / 400
  ├─ runner.start({directory, command})      resolve argv[0], spawn, record
  └─ store.mutate(… defaultId = id)          choosing a command is choosing the default
```

`GET /commands` runs the same first five steps, which is why the button, the menu, and the tooltip
can never disagree about what is in the project.

## The adapter seam

An adapter answers exactly one question — *which commands can be run in this workspace?* — and returns
data, never effects. It does not spawn, does not read preferences, and does not know the browser
exists. `docs/adapters.md` is the contract; `lib/adapters/node-npm.js` is the reference
implementation, and it is deliberately small.

Consequences of the seam:

- **Adding an environment is one file and one line** in `lib/adapters/index.js`.
- **Adapters cannot break each other.** A throwing adapter is logged and skipped
  (`test/registry.test.js` asserts this), so a broken detector for one ecosystem never hides the
  commands another one found.
- **Detection is cheap enough to poll.** Each adapter declares `watch` paths; the workspace stamps
  their `mtime`/size, and an unchanged stamp reuses the previous result.

## Why the browser half is not built

Every other client half in the harness ecosystem is compiled. This one is authored directly in the
loader's registration form (`window.__ModuleLoader__.load({ id, factory })`), for two reasons:

- **Installability.** A build step means either a committed bundle (which the repository would have
  to keep honest) or a `prepare` script, which pnpm blocks for git-hosted packages until the user
  allows it. A plugin people install with one command should not ask them to trust a build script.
- **Honesty about the seam.** The browser half is a thin view; keeping it in one readable file makes
  that obvious rather than hiding 300 lines of React behind a bundler config.

The cost is that the browser half cannot be unit-tested the way the host can — there is no `react` in
`devDependencies` and no DOM in CI. `test/client-contract.test.js` covers what a dependency-free test
*can* cover: that the bundle registers under the package name, that the factory exports the cordis
contract, that the slot registration is the expected one, and that every dictionary is key-identical.
Everything decidable lives on the host precisely so this gap stays small.

## Storage

`core/project-store.js` owns one JSON document under `$DSH_HOME/dsh-run-environment/`:

```json
{
  "version": 1,
  "projects": {
    "/absolute/project/path": {
      "defaultId": "node-npm:dev",
      "hidden": ["node-npm:lint"],
      "custom": [{ "id": "custom:start-the-database", "label": "Start the database", "command": "docker compose up -d" }],
      "updatedAt": "2026-09-17T12:00:00.000Z"
    }
  }
}
```

Decisions worth knowing:

- **Outside the project.** Nothing this plugin learns is written into someone's repository, so it can
  never show up in a diff.
- **Mutations re-read before writing.** Two harness instances on one machine cannot silently clobber
  each other's last action; reads are cached against `mtime`.
- **Corruption is recoverable.** A hand-edited file that no longer parses is moved to
  `<file>.corrupt` instead of being overwritten, and the plugin carries on with empty preferences.
- **Bounded.** The least recently touched projects are pruned past the cap.

## Process lifecycle

`core/runner.js` spawns through the harness `subprocess` service rather than `node:child_process`,
which buys three properties that are hard to get right by hand:

- **Group termination.** `npm run dev` is a process tree. The provider signals the whole group, so
  stopping a command stops the server it started.
- **Output that outlives the process.** Streams are collected with a bounded in-memory tail and an
  on-disk spill, so the failure tooltip and `GET /log` work after the process exits.
- **No orphans on unload.** The plugin's unload hook terminates everything it started.

A command that exits non-zero within `failureWindowMs` of starting is classified as a **failed
launch** rather than a finished command: that is the difference between "the dev server crashed" and
"the build ran and reported a lint error", and only the first one deserves a red button.

## Testing strategy

| Layer | How it is covered |
| --- | --- |
| `core/model.js` | Pure-function tests: ranking, defaults, hiding, custom ids, every refusal. |
| `core/workspace.js` | Real temporary directories; path-escape refusals, caching, fingerprints. |
| `core/registry.js` | Fake adapters: ordering, namespacing, failure isolation, cache invalidation. |
| `core/project-store.js` | Real files: persistence, concurrency, quarantine, pruning. |
| `core/runner.js` | Fake subprocess service: spawn argv, reuse, limits, stop, failure classification. |
| `core/router.js` | End-to-end over the real store and registry with a fake request/response. |
| `lib/client.js` | Registration and plugin contract only (see above). |

`npm test` runs all of it offline in about 0.2 seconds.
