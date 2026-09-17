import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { nodeNpmAdapter } from '../lib/adapters/node-npm.js';
import { openWorkspace } from '../lib/core/workspace.js';
import { DEFAULT_PRIORITY } from '../lib/core/model.js';

/**
 * Detect the commands of one manifest written into a temporary project.
 * @param {object} testContext - node:test context, for cleanup.
 * @param {unknown} manifest - the `package.json` value to write.
 * @returns {Promise<object[]>} the adapter result.
 */
async function detect(testContext, manifest) {
	const directory = await mkdtemp(join(tmpdir(), 'dsh-run-env-npm-'));
	testContext.after(() => rm(directory, { recursive: true, force: true }));
	await writeFile(join(directory, 'package.json'), JSON.stringify(manifest), 'utf8');
	const workspace = await openWorkspace(directory);
	assert.ok(workspace !== null);
	return nodeNpmAdapter.detect({ workspace });
}

test('the adapter declares its identity and what invalidates it', () => {
	assert.equal(nodeNpmAdapter.id, 'node-npm');
	assert.equal(typeof nodeNpmAdapter.title, 'string');
	assert.deepEqual([...nodeNpmAdapter.watch], ['package.json']);
});

test('declared scripts become runnable npm commands in manifest order', async (t) => {
	const commands = await detect(t, {
		scripts: { build: 'astro build', dev: 'astro dev', preview: 'astro preview' },
	});
	assert.deepEqual(
		commands.map((command) => command.id),
		['build', 'dev', 'preview'],
	);
	assert.deepEqual(commands[1].argv, ['npm', 'run', 'dev']);
	assert.equal(commands[1].label, 'npm run dev');
	assert.equal(commands[1].detail, 'astro dev');
});

test('dev outranks start, and everything else keeps the default priority', async (t) => {
	const commands = await detect(t, { scripts: { start: 'node server.js', dev: 'vite', other: 'true' } });
	const byId = new Map(commands.map((command) => [command.id, command]));
	assert.ok(byId.get('dev').priority < byId.get('start').priority);
	assert.equal(byId.get('other').priority, undefined, 'unranked scripts keep the model default');
	assert.equal(DEFAULT_PRIORITY, 100);
});

test('lifecycle companions of a declared script stay out of the menu', async (t) => {
	const commands = await detect(t, {
		scripts: { dev: 'vite', predev: 'rimraf dist', postdev: 'echo done', prepublishOnly: 'npm test' },
	});
	assert.deepEqual(
		commands.map((command) => command.id),
		['dev', 'prepublishOnly'],
		'pre/post of a declared script are dropped; unrelated ones are kept',
	);
});

test('a manifest without usable scripts detects nothing', async (t) => {
	assert.deepEqual(await detect(t, {}), []);
	assert.deepEqual(await detect(t, { scripts: null }), []);
	assert.deepEqual(await detect(t, { scripts: [] }), []);
	assert.deepEqual(await detect(t, { scripts: { dev: 42 } }), [], 'non-string bodies are not runnable');
	assert.deepEqual(await detect(t, { scripts: { '  ': 'true' } }), [], 'blank keys are not runnable');
	assert.deepEqual(await detect(t, { scripts: { 'a b': 'true' } }), [], 'whitespace in a key is not addressable');
	assert.deepEqual(await detect(t, { scripts: { 'rm -rf': 'true' } }), [], 'shell metacharacters never travel');
});

test('a missing or malformed manifest detects nothing', async (t) => {
	const directory = await mkdtemp(join(tmpdir(), 'dsh-run-env-npm-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const workspace = await openWorkspace(directory);
	assert.ok(workspace !== null);
	assert.deepEqual(await nodeNpmAdapter.detect({ workspace }), [], 'absent manifest');

	await writeFile(join(directory, 'package.json'), '{ broken', 'utf8');
	assert.deepEqual(await nodeNpmAdapter.detect({ workspace }), [], 'malformed manifest');
});
