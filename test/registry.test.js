import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { AdapterRegistry } from '../lib/core/registry.js';
import { openWorkspace } from '../lib/core/workspace.js';

/**
 * One temporary workspace holding the given files.
 * @param {object} testContext - node:test context, for cleanup.
 * @param {Record<string, string>} files - relative path to content.
 * @returns {Promise<import('../lib/core/workspace.js').Workspace>} the workspace.
 */
async function workspaceWith(testContext, files) {
	const directory = await mkdtemp(join(tmpdir(), 'dsh-run-env-registry-'));
	testContext.after(() => rm(directory, { recursive: true, force: true }));
	for (const [path, content] of Object.entries(files)) await writeFile(join(directory, path), content, 'utf8');
	const workspace = await openWorkspace(directory);
	assert.ok(workspace !== null);
	return workspace;
}

/** One adapter returning a fixed command list. */
function adapter(id, commands, watch = ['package.json']) {
	return {
		id,
		title: id,
		watch,
		async detect() {
			return commands;
		},
	};
}

/** One detected command. */
function command(id, priority) {
	return { id, label: id, argv: ['echo', id], priority };
}

test('registration order is display order and ids are namespaced', async (t) => {
	const registry = new AdapterRegistry();
	registry.register(adapter('first', [command('a')]));
	registry.register(adapter('second', [command('b')]));
	assert.deepEqual(registry.ids(), ['first', 'second']);

	const commands = await registry.detect(await workspaceWith(t, { 'package.json': '{}' }));
	assert.deepEqual(
		commands.map((entry) => entry.id),
		['first:a', 'second:b'],
	);
	assert.deepEqual(commands[0].argv, ['echo', 'a']);
});

test('malformed adapters are refused at registration', () => {
	const registry = new AdapterRegistry();
	assert.throws(() => registry.register(null), /must be an object/);
	assert.throws(() => registry.register({ id: 'Bad Id', title: 'x', watch: [], detect() {} }), /adapter id/);
	assert.throws(() => registry.register({ id: 'ok', title: '', watch: [], detect() {} }), /needs a title/);
	assert.throws(() => registry.register({ id: 'ok', title: 'x', watch: 'package.json', detect() {} }), /watch must be a string array/);
	assert.throws(() => registry.register({ id: 'ok', title: 'x', watch: [] }), /needs a detect function/);

	registry.register(adapter('ok', []));
	assert.throws(() => registry.register(adapter('ok', [])), /already registered/);
});

test('one failing adapter never hides the others', async (t) => {
	const warnings = [];
	const registry = new AdapterRegistry({ logger: { warn: (message) => warnings.push(message) } });
	registry.register({
		id: 'broken',
		title: 'broken',
		watch: [],
		async detect() {
			throw new Error('detection exploded');
		},
	});
	registry.register(adapter('healthy', [command('a')]));

	const commands = await registry.detect(await workspaceWith(t, { 'package.json': '{}' }));
	assert.deepEqual(
		commands.map((entry) => entry.id),
		['healthy:a'],
	);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /detection exploded/);
});

test('an adapter result without argv fails that adapter only', async (t) => {
	const registry = new AdapterRegistry();
	registry.register(adapter('bad', [{ id: 'x', argv: [] }]));
	registry.register(adapter('good', [command('a')]));
	const commands = await registry.detect(await workspaceWith(t, { 'package.json': '{}' }));
	assert.deepEqual(
		commands.map((entry) => entry.id),
		['good:a'],
	);
});

test('detection is cached until a watched file changes', async (t) => {
	let runs = 0;
	const registry = new AdapterRegistry();
	registry.register({
		id: 'counting',
		title: 'counting',
		watch: ['package.json'],
		async detect() {
			runs += 1;
			return [command('a')];
		},
	});
	const workspace = await workspaceWith(t, { 'package.json': '{}' });

	await registry.detect(workspace);
	await registry.detect(workspace);
	assert.equal(runs, 1, 'an unchanged watched file is not re-detected');

	await writeFile(join(workspace.directory, 'package.json'), '{"changed":true}', 'utf8');
	await registry.detect(workspace);
	assert.equal(runs, 2, 'a touched watched file is re-detected');
});

test('every watched path is de-duplicated', () => {
	const registry = new AdapterRegistry();
	registry.register(adapter('one', [], ['package.json', 'pyproject.toml']));
	registry.register(adapter('two', [], ['package.json']));
	assert.deepEqual(registry.watchPaths(), ['package.json', 'pyproject.toml']);
});
