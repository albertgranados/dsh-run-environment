# Writing an adapter

An adapter teaches the plugin how one kind of project is run. It is a plain object with four fields
and one method, it returns data, and it never spawns anything.

This is the whole contract — `lib/core/registry.js` enforces it at registration:

```js
/**
 * @typedef {object} Adapter
 * @property {string} id       stable lowercase id, unique in the registry
 * @property {string} title    human name shown as the menu section header
 * @property {readonly string[]} watch  workspace-relative paths whose change invalidates detection
 * @property {(context: {workspace: Workspace}) => Promise<readonly DetectedCommand[]>} detect
 */
```

`detect` returns zero or more commands. Zero means "not my kind of project", which is a normal answer,
not a failure.

```js
/**
 * @typedef {object} DetectedCommand
 * @property {string} id        adapter-local key, unique within this adapter
 * @property {string} [label]   short menu label; defaults to the argv text
 * @property {string} [detail]  secondary text (usually the underlying command)
 * @property {string} [manifest]  the file that declared it, used as the menu's
 *   section title; defaults to the adapter's first watched path
 * @property {readonly string[]} argv  exact argv; argv[0] is a bare PATH program or an absolute path
 * @property {number} [priority]  lower runs first and wins the default; defaults to 100
 */
```

Commands with the same `manifest` are shown together under that file name, which is what makes a
workspace that is both a Node package and a Make project legible instead of a flat list.

## The workspace API

`detect` receives a `Workspace`: one directory proved to exist, with reads confined to it.

| Member | Returns |
| --- | --- |
| `directory` | The absolute project root. |
| `readText(path)` | File text, or `null` when unreadable. Cached by modification time. |
| `readJson(path)` | Parsed JSON, or `null` when unreadable or malformed. |
| `statOf(path)` | `{ mtimeMs, size }`, or `null` when absent or not a regular file. |
| `pathOf(path)` | An absolute path inside the root; throws on escapes. |

Adapters must use these rather than `node:fs`: the cache is what makes polling the command list
cheap, and the confinement is what keeps a workspace claim from reading the rest of the disk.

## Worked example: a Makefile adapter

```js
// lib/adapters/make.js
const TARGET = /^([A-Za-z0-9][A-Za-z0-9._-]*):(?!=)/;

/** The GNU Make adapter: one command per phony-looking target. */
export const makeAdapter = {
  id: 'make',
  title: 'Make',
  watch: ['Makefile', 'makefile', 'GNUmakefile'],

  async detect({ workspace }) {
    const manifest = await workspace.readText('Makefile');
    if (manifest === null) return [];
    return manifest
      .split('\n')
      .map((line) => TARGET.exec(line)?.[1])
      .filter((target) => target !== undefined && !target.startsWith('.'))
      .map((target) => ({
        id: target,
        label: `make ${target}`,
        manifest: 'Makefile',
        argv: ['make', target],
        priority: target === 'run' || target === 'dev' ? 10 : undefined,
      }));
  },
};
```

Register it in `lib/adapters/index.js`:

```js
export const builtinAdapters = [nodeNpmAdapter, makeAdapter];
```

Add `test/make.test.js` next to it, following `test/node-npm.test.js`: write a fixture into a
temporary directory, call `detect`, assert the command list. No harness, no mocks, no network.

## Rules that keep the seam honest

1. **Return data, never effects.** No spawning, no writes, no network. The runner owns execution.
2. **Never read preferences.** Whether a command is hidden or default is the model's business.
3. **Declare your `watch` paths.** A missing entry means a stale menu until the harness restarts.
4. **Reject loudly, and only for your own adapter.** Throwing removes *your* commands for that read
   and is logged; the other adapters still answer. Return `[]` for "not my project" instead.
5. **Namespace nothing.** Return `dev`, not `node-npm:dev` — the registry namespaces it, so two
   ecosystems can both expose a `test` target without colliding.
6. **Rank what you know.** `dev`/`start`-style entry points get a low `priority`; everything else
   keeps the default and stays in manifest order.
7. **Name the manifest that matched.** `manifest` is what the menu shows as the section title, so a
   reader knows where a command came from — and where to edit it.
8. **Keep ids addressable.** They travel in URLs and stored preferences, so avoid whitespace, quotes,
   and shell metacharacters — `test/node-npm.test.js` shows the shape the npm adapter accepts.
9. **Do not assume a program exists.** `argv[0]` is resolved through the harness's execution world;
   a missing program becomes a 502 with a clear message, which is the right outcome.

You do not have to think about renames, icons, hiding, or defaults: those are per-command
preferences the model folds in on top of whatever you return.

## Checklist for a new adapter

- [ ] `lib/adapters/<id>.js` exporting the adapter object.
- [ ] Registered in `lib/adapters/index.js`.
- [ ] `test/<id>.test.js` covering: a real project, an empty one, a malformed manifest, and any
      ranking rule.
- [ ] A row added to the table in `README.md` (and a tick in `ROADMAP.md` if it was planned).
- [ ] A line under `## Unreleased` in `CHANGELOG.md`.
