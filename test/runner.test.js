import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

import { HttpError } from '../lib/core/errors.js';
import { RunRegistry } from '../lib/core/runner.js';

/**
 * A subprocess service stand-in: it records spawns and lets a test decide how
 * each process ends.
 * @returns {object} the fake service.
 */
function fakeSubprocess() {
	/** @type {object[]} */
	const spawned = [];
	return {
		spawned,
		async resolveExecutable(program) {
			if (program === 'missing') throw new Error('ENOENT');
			return `/fake/bin/${program}`;
		},
		spawn(spec) {
			let settle = () => {};
			const done = new Promise((resolve) => {
				settle = resolve;
			});
			const streams = { stdout: '', stderr: '' };
			const handle = {
				spec,
				terminated: false,
				collected: {
					stdout: { readFrom: () => ({ text: streams.stdout, nextOffset: streams.stdout.length, lossy: false }) },
					stderr: { readFrom: () => ({ text: streams.stderr, nextOffset: streams.stderr.length, lossy: false }) },
				},
				done,
				terminate() {
					handle.terminated = true;
					settle({ exitCode: null, signal: 'SIGTERM' });
				},
				async waitForExit() {
					await done;
					return true;
				},
				/** Append output a test wants the log tail to carry. */
				write(chunk, stream = 'stdout') {
					streams[stream] += chunk;
				},
				/** End the process with exit facts. */
				end(exitCode) {
					settle({ exitCode, signal: null });
				},
			};
			spawned.push(handle);
			return handle;
		},
	};
}

/**
 * One registry over a fake subprocess.
 * @param {object} [limits] - limit overrides.
 * @returns {{runs: RunRegistry, subprocess: object}} the pair.
 */
function registryWith(limits = {}) {
	const subprocess = fakeSubprocess();
	const runs = new RunRegistry({
		subprocess,
		limits: {
			maxConcurrentRuns: 8,
			collectBytes: 4096,
			spillBytes: 65536,
			graceMs: 100,
			failureWindowMs: 30_000,
			...limits,
		},
	});
	return { runs, subprocess };
}

/** One detected command, namespaced the way the registry namespaces them. */
function command(key, argv = ['echo', key]) {
	return { id: `node-npm:${key}`, label: `npm run ${key}`, command: argv.join(' '), argv, priority: 100 };
}

test('a detected command spawns its argv with a resolved program', async () => {
	const { runs, subprocess } = registryWith();
	const run = await runs.start({ directory: '/p', command: command('hi', ['echo', 'hi']) });
	assert.equal(run.id, 'node-npm:hi');
	assert.deepEqual(subprocess.spawned[0].spec.argv, ['/fake/bin/echo', 'hi']);
	assert.equal(subprocess.spawned[0].spec.cwd, '/p');
	assert.equal(run.state, 'running');
	assert.equal(subprocess.spawned[0].spec.stdio.stdin, 'ignore');
});

test('a user-defined command runs through the shell', async () => {
	const { runs, subprocess } = registryWith();
	await runs.start({
		directory: '/p',
		command: { id: 'custom:x', label: 'X', command: 'docker compose up -d', argv: null },
	});
	assert.deepEqual(subprocess.spawned[0].spec.argv, ['/bin/sh', '-c', 'docker compose up -d']);
});

test('a Windows host wraps a user command in cmd.exe', async () => {
	const subprocess = fakeSubprocess();
	const runs = new RunRegistry({
		subprocess,
		platform: 'win32',
		limits: { maxConcurrentRuns: 1, collectBytes: 4096, spillBytes: 65536, graceMs: 100, failureWindowMs: 1000 },
	});
	await runs.start({ directory: '/p', command: { id: 'custom:x', label: 'X', command: 'dir', argv: null } });
	assert.deepEqual(subprocess.spawned[0].spec.argv, ['cmd.exe', '/d', '/s', '/c', 'dir']);
});

test('the same command is never spawned twice while it is alive', async () => {
	const { runs, subprocess } = registryWith();
	const first = await runs.start({ directory: '/p', command: command('a') });
	const second = await runs.start({ directory: '/p', command: command('a') });
	assert.equal(subprocess.spawned.length, 1);
	assert.equal(first, second, 'the live run is reused, so a double click cannot race two servers');
});

test('the concurrency limit refuses the next start', async () => {
	const { runs } = registryWith({ maxConcurrentRuns: 1 });
	await runs.start({ directory: '/p', command: command('a') });
	const error = await runs.start({ directory: '/p', command: command('b') }).then(
		() => null,
		(cause) => cause,
	);
	assert.ok(error instanceof HttpError);
	assert.equal(error.status, 429);
	assert.equal(error.code, 'too-many-runs');
});

test('a program that cannot be resolved fails the launch, not the plugin', async () => {
	const { runs } = registryWith();
	const error = await runs.start({ directory: '/p', command: command('a', ['missing', 'x']) }).then(
		() => null,
		(cause) => cause,
	);
	assert.ok(error instanceof HttpError);
	assert.equal(error.status, 502);
	assert.match(error.message, /not found on PATH/);
});

test('an early non-zero exit is a failed launch and carries its output', async () => {
	const { runs, subprocess } = registryWith();
	const run = await runs.start({ directory: '/p', command: command('lint') });
	subprocess.spawned[0].write('3 problems\n', 'stderr');
	subprocess.spawned[0].end(3);
	await delay(0);

	const payload = runs.payload(run);
	assert.equal(payload.state, 'exited');
	assert.equal(payload.exitCode, 3);
	assert.equal(payload.failed, true);
	assert.match(payload.tail, /3 problems/);
});

test('a command that ran for a while and then failed is not a failed launch', async () => {
	const { runs, subprocess } = registryWith({ failureWindowMs: 5 });
	const run = await runs.start({ directory: '/p', command: command('long') });
	await delay(20);
	subprocess.spawned[0].end(1);
	await delay(0);

	const payload = runs.payload(run);
	assert.equal(payload.failed, false, 'past the window it is a finished command');
	assert.equal(payload.exitCode, 1);
	assert.equal('tail' in payload, false);
});

test('a clean exit is never a failure', async () => {
	const { runs, subprocess } = registryWith();
	const run = await runs.start({ directory: '/p', command: command('build') });
	subprocess.spawned[0].end(0);
	await delay(0);
	assert.equal(runs.payload(run).failed, false);
});

test('stopping terminates the run and never reports it as a failure', async () => {
	const { runs, subprocess } = registryWith();
	await runs.start({ directory: '/p', command: command('dev') });
	const stopped = await runs.stop('/p', 'node-npm:dev');
	assert.equal(subprocess.spawned[0].terminated, true);
	assert.equal(stopped.state, 'exited');
	assert.equal(stopped.stopped, true);
	assert.equal(runs.payload(stopped).failed, false);
	assert.equal(await runs.stop('/p', 'node-npm:absent'), null);
});

test('runs are listed per project, newest first', async () => {
	const { runs } = registryWith();
	await runs.start({ directory: '/p', command: command('a') });
	await delay(2);
	await runs.start({ directory: '/p', command: command('b') });
	await runs.start({ directory: '/other', command: command('a') });
	assert.deepEqual(
		runs.list('/p').map((run) => run.id),
		['node-npm:b', 'node-npm:a'],
	);
	assert.equal(runs.list('/other').length, 1);
	assert.equal(runs.list('/nowhere').length, 0);
});

test('unloading the plugin stops what it started', async () => {
	const { runs, subprocess } = registryWith();
	await runs.start({ directory: '/p', command: command('dev') });
	runs.dispose();
	assert.equal(subprocess.spawned[0].terminated, true);
});
