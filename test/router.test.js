import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { nodeNpmAdapter } from '../lib/adapters/node-npm.js';
import { ProjectStore } from '../lib/core/project-store.js';
import { AdapterRegistry } from '../lib/core/registry.js';
import { createRouter, ROUTE_PREFIX } from '../lib/core/router.js';
import { RunRegistry } from '../lib/core/runner.js';

/** One request stand-in carrying an optional JSON body. */
function request({ method = 'GET', url = '/', body = null, headers = {} } = {}) {
	const chunks = body === null ? [] : [Buffer.from(body)];
	return {
		method,
		url,
		headers,
		resume() {},
		async *[Symbol.asyncIterator]() {
			for (const chunk of chunks) yield chunk;
		},
	};
}

/** One response stand-in recording what the router wrote. */
function response() {
	return {
		statusCode: 0,
		headers: {},
		body: '',
		setHeader(name, value) {
			this.headers[name.toLowerCase()] = value;
		},
		end(text) {
			if (typeof text === 'string') this.body += text;
		},
		/** Parsed JSON body. */
		get json() {
			return JSON.parse(this.body);
		},
	};
}

/** A subprocess stand-in that never actually spawns anything. */
function fakeSubprocess() {
	const spawned = [];
	return {
		spawned,
		async resolveExecutable(program) {
			return `/fake/bin/${program}`;
		},
		spawn(spec) {
			let settle = () => {};
			const done = new Promise((resolve) => {
				settle = resolve;
			});
			const handle = {
				spec,
				collected: { stdout: { readFrom: () => ({ text: 'ready\n' }) }, stderr: { readFrom: () => ({ text: '' }) } },
				done,
				terminate() {
					settle({ exitCode: null, signal: 'SIGTERM' });
				},
				async waitForExit() {
					await done;
					return true;
				},
			};
			spawned.push(handle);
			return handle;
		},
	};
}

/**
 * A router over a real registry, store, and runner, with a controllable fence.
 * @param {object} testContext - node:test context, for cleanup.
 * @param {{rejection?: number, visibility?: string, directory?: string}} [options] - overrides.
 * @returns {Promise<object>} the assembled fixture.
 */
async function fixture(testContext, options = {}) {
	const root = await mkdtemp(join(tmpdir(), 'dsh-run-env-router-'));
	testContext.after(() => rm(root, { recursive: true, force: true }));
	const directory = options.directory ?? join(root, 'project');
	if (options.directory === undefined) {
		await mkdir(directory, { recursive: true });
		await writeFile(
			join(directory, 'package.json'),
			JSON.stringify({ scripts: { build: 'astro build', dev: 'astro dev', lint: 'eslint .' } }),
			'utf8',
		);
	}
	const registry = new AdapterRegistry();
	registry.register(nodeNpmAdapter);
	const store = new ProjectStore({ file: join(root, 'projects.json') });
	const runs = new RunRegistry({
		subprocess: fakeSubprocess(),
		limits: { maxConcurrentRuns: 8, collectBytes: 4096, spillBytes: 65536, graceMs: 100, failureWindowMs: 30_000 },
	});
	const router = createRouter({
		connection: { requestRejection: () => options.rejection },
		registry,
		store,
		runs,
		visibility: options.visibility ?? 'auto',
		limits: { maxConcurrentRuns: 8 },
	});
	/**
	 * Call one operation.
	 * @param {string} path - path under the prefix.
	 * @param {object} [init] - request overrides.
	 * @returns {Promise<object>} the response.
	 */
	const call = async (path, init = {}) => {
		const res = response();
		await router.handler(request({ url: `${ROUTE_PREFIX}${path}`, ...init }), res);
		return res;
	};
	return { root, directory, store, runs, router, call };
}

/** One JSON POST body. */
function json(body) {
	return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

test('the route is a prefix registration under the plugin name', () => {
	const router = createRouter({
		connection: { requestRejection: () => undefined },
		registry: new AdapterRegistry(),
		store: new ProjectStore({ file: '/tmp/unused.json' }),
		runs: new RunRegistry({ subprocess: fakeSubprocess(), limits: {} }),
		visibility: 'auto',
		limits: {},
	});
	assert.equal(router.kind, 'prefix');
	assert.equal(router.path, '/run-environment');
});

test('the trust fence answers before anything else happens', async (t) => {
	const { call, directory } = await fixture(t, { rejection: 401 });
	const res = await call(`/commands?cwd=${encodeURIComponent(directory)}`);
	assert.equal(res.statusCode, 401);
	assert.equal(res.body, '');
});

test('GET /commands reports the detected model', async (t) => {
	const { call, directory } = await fixture(t);
	const res = await call(`/commands?cwd=${encodeURIComponent(directory)}`);
	assert.equal(res.statusCode, 200);
	assert.equal(res.headers['cache-control'], 'no-store');
	const payload = res.json;
	assert.equal(payload.ok, true);
	assert.equal(payload.present, true);
	assert.deepEqual(payload.adapters, ['node-npm']);
	assert.deepEqual(
		payload.commands.map((command) => command.id),
		['node-npm:build', 'node-npm:dev', 'node-npm:lint'],
	);
	assert.equal(payload.defaultId, 'node-npm:dev', 'dev outranks manifest order');
	assert.deepEqual(payload.runs, []);
});

test('a workspace without commands reports present:false and renders nothing', async (t) => {
	const { call } = await fixture(t);
	const bare = await mkdtemp(join(tmpdir(), 'dsh-run-env-bare-'));
	t.after(() => rm(bare, { recursive: true, force: true }));
	const res = await call(`/commands?cwd=${encodeURIComponent(bare)}`);
	assert.equal(res.json.present, false);
	assert.deepEqual(res.json.commands, []);
});

test('visibility always and never override detection', async (t) => {
	const bare = await mkdtemp(join(tmpdir(), 'dsh-run-env-bare-'));
	t.after(() => rm(bare, { recursive: true, force: true }));
	const always = await fixture(t, { visibility: 'always' });
	assert.equal((await always.call(`/commands?cwd=${encodeURIComponent(bare)}`)).json.present, true);
	const never = await fixture(t, { visibility: 'never' });
	assert.equal((await never.call(`/commands?cwd=${encodeURIComponent(bare)}`)).json.present, false);
});

test('POST /run spawns the command and remembers it as the default', async (t) => {
	const { call, directory, store } = await fixture(t);
	const res = await call('/run', json({ cwd: directory, id: 'node-npm:build' }));
	assert.equal(res.statusCode, 200);
	assert.equal(res.json.run.state, 'running');
	assert.equal(res.json.run.id, 'node-npm:build');
	assert.equal((await store.read(directory)).defaultId, 'node-npm:build');

	const after = await call(`/commands?cwd=${encodeURIComponent(directory)}`);
	assert.equal(after.json.defaultId, 'node-npm:build');
	assert.equal(after.json.runs.length, 1);
});

test('POST /stop stops the named run', async (t) => {
	const { call, directory } = await fixture(t);
	await call('/run', json({ cwd: directory, id: 'node-npm:dev' }));
	const res = await call('/stop', json({ cwd: directory, id: 'node-npm:dev' }));
	assert.equal(res.statusCode, 200);
	assert.equal(res.json.run.stopped, true);
	assert.equal(res.json.run.state, 'exited');
});

test('POST /state hides, shows, and defines commands', async (t) => {
	const { call, directory } = await fixture(t);
	const hide = await call('/state', json({ cwd: directory, action: 'hide', id: 'node-npm:lint' }));
	assert.equal(hide.statusCode, 200);
	assert.deepEqual(hide.json.state.hidden, ['node-npm:lint']);
	assert.equal(hide.json.commands.find((command) => command.id === 'node-npm:lint').hidden, true);

	const show = await call('/state', json({ cwd: directory, action: 'show', id: 'node-npm:lint' }));
	assert.deepEqual(show.json.state.hidden, []);

	const add = await call(
		'/state',
		json({ cwd: directory, action: 'add-custom', label: 'Start the database', command: 'docker compose up -d' }),
	);
	assert.equal(add.statusCode, 200);
	const custom = add.json.commands.find((command) => command.source === 'custom');
	assert.equal(custom.id, 'custom:start-the-database');
	assert.equal(custom.command, 'docker compose up -d');

	const remove = await call('/state', json({ cwd: directory, action: 'remove-custom', id: custom.id }));
	assert.equal(remove.json.commands.some((command) => command.source === 'custom'), false);
});

test('GET /commands publishes the icon set the picker offers', async (t) => {
	const { call, directory } = await fixture(t);
	const payload = (await call(`/commands?cwd=${encodeURIComponent(directory)}`)).json;
	assert.ok(Array.isArray(payload.icons));
	assert.ok(payload.icons.includes('default'));
	assert.equal(payload.commands.every((command) => payload.icons.includes(command.icon)), true);
});

test('POST /state renames a detected command and picks its icon', async (t) => {
	const { call, directory } = await fixture(t);
	const edited = await call(
		'/state',
		json({ cwd: directory, action: 'edit', id: 'node-npm:dev', label: 'Arrancar el front', icon: 'sparkle' }),
	);
	assert.equal(edited.statusCode, 200);
	const dev = edited.json.commands.find((command) => command.id === 'node-npm:dev');
	assert.equal(dev.label, 'Arrancar el front');
	assert.equal(dev.icon, 'sparkle');
	assert.equal(dev.command, 'npm run dev', 'the command line still comes from the manifest');
	assert.equal(dev.manifest, 'package.json');

	const unknownIcon = await call(
		'/state',
		json({ cwd: directory, action: 'edit', id: 'node-npm:dev', label: 'x', icon: 'nope' }),
	);
	assert.equal(unknownIcon.statusCode, 400);
	assert.match(unknownIcon.json.message, /unknown icon/);
});

test('POST /state sets the default without running anything', async (t) => {
	const { call, directory } = await fixture(t);
	const res = await call('/state', json({ cwd: directory, action: 'set-default', id: 'node-npm:build' }));
	assert.equal(res.statusCode, 200);
	assert.equal(res.json.defaultId, 'node-npm:build');
	assert.deepEqual(res.json.state.hidden, []);
});

test('GET /log returns the collected tail as text', async (t) => {
	const { call, directory } = await fixture(t);
	await call('/run', json({ cwd: directory, id: 'node-npm:dev' }));
	const res = await call(`/log?cwd=${encodeURIComponent(directory)}&id=node-npm:dev`);
	assert.equal(res.statusCode, 200);
	assert.match(res.headers['content-type'], /text\/plain/);
	assert.match(res.body, /ready/);
	const missing = await call(`/log?cwd=${encodeURIComponent(directory)}&id=node-npm:build`);
	assert.equal(missing.statusCode, 404);
});

test('unknown routes, wrong methods, and unusable bodies are refused', async (t) => {
	const { call, directory } = await fixture(t);
	assert.equal((await call('/nonsense')).statusCode, 404);
	const wrongMethod = await call('/commands?cwd=/tmp', { method: 'POST' });
	assert.equal(wrongMethod.statusCode, 405);
	assert.equal(wrongMethod.headers.allow, 'GET');

	const wrongType = await call('/run', { method: 'POST', body: 'cwd=x' });
	assert.equal(wrongType.statusCode, 415);
	assert.equal(wrongType.json.code, 'unsupported-media-type');

	const notJson = await call('/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
	assert.equal(notJson.statusCode, 400);

	const notObject = await call('/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '[]' });
	assert.equal(notObject.statusCode, 400);

	const missingField = await call('/run', json({ cwd: directory }));
	assert.equal(missingField.statusCode, 400);

	const tooLarge = await call('/run', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ cwd: directory, id: 'x'.repeat(20_000) }),
	});
	assert.equal(tooLarge.statusCode, 413);
});

test('commands are addressed by id, never by a program from the wire', async (t) => {
	const { call, directory } = await fixture(t);
	const unknown = await call('/run', json({ cwd: directory, id: 'node-npm:missing' }));
	assert.equal(unknown.statusCode, 404);

	const injected = await call('/run', json({ cwd: directory, id: 'rm -rf /' }));
	assert.equal(injected.statusCode, 404, 'a program name is not a command id');

	const notAProject = await call('/run', json({ cwd: '/tmp', id: 'node-npm:dev' }));
	assert.equal(notAProject.statusCode, 404);
});
