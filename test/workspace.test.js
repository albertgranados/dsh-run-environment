import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { openWorkspace, Workspace } from '../lib/core/workspace.js';

/** One temporary directory, removed when the test finishes. */
async function temporaryDirectory(t) {
	const directory = await mkdtemp(join(tmpdir(), 'dsh-run-env-workspace-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	return directory;
}

test('openWorkspace refuses everything that is not an absolute existing directory', async (t) => {
	const directory = await temporaryDirectory(t);
	const file = join(directory, 'package.json');
	await writeFile(file, '{}', 'utf8');

	assert.equal(await openWorkspace(''), null, 'empty claim');
	assert.equal(await openWorkspace('relative/path'), null, 'relative claim');
	assert.equal(await openWorkspace(file), null, 'a regular file is not a workspace');
	assert.equal(await openWorkspace(join(directory, 'missing')), null, 'absent directory');
	assert.equal(await openWorkspace(undefined), null, 'non-string claim');

	const workspace = await openWorkspace(directory);
	assert.ok(workspace instanceof Workspace);
	assert.equal(workspace.directory, directory);
});

test('reads are confined to the project root', async (t) => {
	const directory = await temporaryDirectory(t);
	const workspace = new Workspace(directory);

	assert.throws(() => workspace.pathOf('../escape'), /escapes the project root/);
	assert.throws(() => workspace.pathOf('/etc/passwd'), /escapes the project root/);
	assert.equal(workspace.pathOf('nested/manifest.json'), join(directory, 'nested', 'manifest.json'));
});

test('readText and readJson report absence instead of throwing', async (t) => {
	const directory = await temporaryDirectory(t);
	const workspace = new Workspace(directory);

	assert.equal(await workspace.readText('missing.txt'), null);
	assert.equal(await workspace.readJson('missing.json'), null);
	assert.equal(await workspace.statOf('missing.json'), null);

	await writeFile(join(directory, 'broken.json'), '{ not json', 'utf8');
	assert.equal(await workspace.readJson('broken.json'), null, 'malformed JSON reads as absent');

	await writeFile(join(directory, 'good.json'), '{"a":1}', 'utf8');
	assert.deepEqual(await workspace.readJson('good.json'), { a: 1 });
});

test('an unchanged file is served from cache and a touched file is re-read', async (t) => {
	const directory = await temporaryDirectory(t);
	const workspace = new Workspace(directory);
	const file = join(directory, 'package.json');
	await writeFile(file, '{"name":"first"}', 'utf8');
	assert.match(await workspace.readText('package.json'), /first/);

	// Same content, newer timestamp: still a re-read, which is what makes the
	// cache safe to trust.
	await writeFile(file, '{"name":"second"}', 'utf8');
	assert.match(await workspace.readText('package.json'), /second/);
});

test('a fingerprint changes when a watched file changes and ignores absent files', async (t) => {
	const directory = await temporaryDirectory(t);
	const workspace = new Workspace(directory);
	await writeFile(join(directory, 'a.json'), '{}', 'utf8');

	const first = await workspace.fingerprint(['a.json', 'absent.json']);
	assert.equal(await workspace.fingerprint(['a.json', 'absent.json']), first, 'stable while nothing moves');

	await writeFile(join(directory, 'a.json'), '{"changed":true}', 'utf8');
	assert.notEqual(await workspace.fingerprint(['a.json', 'absent.json']), first);
});
