# Security policy

## Reporting a vulnerability

Report privately through GitHub's [private vulnerability
reporting](https://github.com/albertgranados/dsh-run-environment/security/advisories/new), or by email
to **albertgranro@gmail.com** if you cannot use GitHub. Please do not open a public issue for anything
exploitable.

Include what you need to make the problem reproducible: the harness version (`dsh --version`), the
plugin version, the affected route or UI path, and the smallest request or interaction that shows the
problem. You will get an acknowledgement within a few days and credit in the advisory unless you ask
otherwise.

## What this plugin can do

It is worth being explicit, because the plugin's whole job is to start processes.

- **It runs commands.** A detected command is an adapter's argv (`npm run dev`); a user-defined
  command is a shell line the user typed, executed through their shell in the project directory.
  Both run with the harness's own privileges, as the user who started the harness.
- **It exposes HTTP routes** on the harness's web server (`/run-environment/*`).
- **It stores preferences** in `$DSH_HOME/dsh-run-environment/projects.json`.

## The threat model

**Every route is behind the harness's fence.** Each request first asks the composition's `connection`
service for a rejection, which enforces the harness's Host/Origin check and its browser login cookie.
A request that is not from the authenticated browser is refused before a project, a command, a log
tail, or a spawn is reachable.

**Execution is addressed by id, never by command text.** `POST /run` accepts `{ cwd, id }` and
resolves `id` against the model the host built from that workspace: unknown ids are `404`, hidden ones
are `400`. There is no route that accepts a program or an argument list from the wire. See
`test/router.test.js` ("commands are addressed by id, never by a program from the wire").

**What that does not protect against.** An agent running in the same harness reaches the same API with
the same cookie, so it can start any command the *project already declares*, and it can declare new
ones through `POST /state` (`add-custom`) — which is a deliberate configuration write, and the reason
this endpoint is separate from execution. Treat the harness token exactly as you treat a shell on the
machine: anything that can drive the harness can drive the projects it has open. If you do not want
that, set `visibility: never` (the API then reports nothing to run) or uninstall the plugin.

**Path handling.** A claimed `cwd` must be absolute and must exist as a directory; the workspace layer
confines every adapter read to that root and refuses paths that escape it
(`test/workspace.test.js`).

**Output.** Collected stdout/stderr is served back through `GET /log` behind the same fence, and the
spill file the harness writes is readable only by the user running the harness.

**No network, no telemetry.** The plugin makes no outbound requests. It reads manifests inside the
project, writes one JSON document under `$DSH_HOME`, and spawns the commands it was asked to spawn.

## Supported versions

The latest release on `main` is supported. Fixes land there and are released as a patch version.
