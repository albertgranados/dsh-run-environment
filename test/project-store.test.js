import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ProjectStore } from '../lib/core/project-store.js';

/**
 * One store over a temporary state file.
 * @param {object} testContext - node:test context, for cleanup.
 * @returns {Promise<{store: ProjectStore, file: string}>} the store and its path.
 */
async function temporaryStore(testContext) {
	const directory = await mkdtemp(join(tmpdir(), 'dsh-run-env-store-'));
	testContext.after(() => rm(directory, { recursive: true, force: true }));
	const file = join(directory, 'projects.json');
	return { store: new ProjectStore({ file }), file };
}

test('an absent state file reads as empty preferences', async (t) => {
	const { store } = await temporaryStore(t);
	assert.deepEqual(await store.read('/some/project'), { defaultId: null, hidden: [], custom: [] });
});

test('a mutation persists and is visible to a second store instance', async (t) => {
	const { store, file } = await temporaryStore(t);
	const next = await store.mutate('/some/project', (state) => ({
		...state,
		custom: [{ id: 'custom:seed', label: 'Seed', command: 'npm run db:seed' }],
	}));
	assert.equal(next.custom.length, 1);

	const document = JSON.parse(await readFile(file, 'utf8'));
	assert.equal(document.version, 1);
	assert.ok(typeof document.projects['/some/project'].updatedAt === 'string');

	const reopened = new ProjectStore({ file });
	assert.deepEqual((await reopened.read('/some/project')).custom, [
		{ id: 'custom:seed', label: 'Seed', command: 'npm run db:seed' },
	]);
});

test('concurrent mutations do not interleave their writes', async (t) => {
	const { store } = await temporaryStore(t);
	await Promise.all([
		store.mutate('/p', (state) => ({ ...state, defaultId: 'a:b' })),
		store.mutate('/p', (state) => ({ ...state, hidden: ['c:d'] })),
		store.mutate('/p', (state) => ({
			...state,
			custom: [{ id: 'custom:x', label: 'X', command: 'x' }],
		})),
	]);
	const state = await store.read('/p');
	assert.equal(state.defaultId, 'a:b');
	assert.deepEqual(state.hidden, ['c:d']);
	assert.equal(state.custom.length, 1);
});

test('a hand-edited file that no longer parses is quarantined, not overwritten', async (t) => {
	const warnings = [];
	const directory = await mkdtemp(join(tmpdir(), 'dsh-run-env-store-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const file = join(directory, 'projects.json');
	await writeFile(file, '{ this is not json', 'utf8');

	const store = new ProjectStore({ file, logger: { warn: (message) => warnings.push(message) } });
	assert.deepEqual(await store.read('/p'), { defaultId: null, hidden: [], custom: [] });
	assert.equal(await readFile(`${file}.corrupt`, 'utf8'), '{ this is not json', 'the user keeps their bytes');
	assert.equal(warnings.length, 1);
});

test('a document of the wrong shape is treated as corrupt', async (t) => {
	const directory = await mkdtemp(join(tmpdir(), 'dsh-run-env-store-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const file = join(directory, 'projects.json');
	await writeFile(file, '["not","a","document"]', 'utf8');
	const store = new ProjectStore({ file });
	assert.deepEqual(await store.read('/p'), { defaultId: null, hidden: [], custom: [] });
});

test('the document is pruned to the least recently used projects', async (t) => {
	const directory = await mkdtemp(join(tmpdir(), 'dsh-run-env-store-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const file = join(directory, 'projects.json');
	await writeFile(
		file,
		JSON.stringify({
			version: 1,
			projects: {
				'/old': { defaultId: null, hidden: [], custom: [], updatedAt: '2020-01-01T00:00:00.000Z' },
				'/new': { defaultId: null, hidden: [], custom: [], updatedAt: '2030-01-01T00:00:00.000Z' },
			},
		}),
		'utf8',
	);
	const store = new ProjectStore({ file, maxProjects: 2 });
	await store.mutate('/fresh', (state) => state);
	const document = JSON.parse(await readFile(file, 'utf8'));
	assert.deepEqual(Object.keys(document.projects).sort(), ['/fresh', '/new']);
});

test('a state file that changes under us is re-read before the next mutation', async (t) => {
	const { store, file } = await temporaryStore(t);
	await store.mutate('/p', (state) => ({ ...state, defaultId: 'a:b' }));
	await writeFile(
		file,
		JSON.stringify({
			version: 1,
			projects: { '/p': { defaultId: 'c:d', hidden: [], custom: [] } },
		}),
		'utf8',
	);
	await store.mutate('/p', (state) => ({ ...state, hidden: ['e:f'] }));
	const document = JSON.parse(await readFile(file, 'utf8'));
	assert.equal(document.projects['/p'].defaultId, 'c:d', 'the external edit is not clobbered');
	assert.deepEqual(document.projects['/p'].hidden, ['e:f']);
});
