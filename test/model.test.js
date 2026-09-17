import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpError } from '../lib/core/errors.js';
import {
	applyAction,
	buildCommands,
	commandId,
	commandPayload,
	DEFAULT_ICON,
	DEFAULT_PRIORITY,
	emptyState,
	ICON_IDS,
	normalizeState,
	slugify,
} from '../lib/core/model.js';

/** One detected command shaped exactly as the registry produces them. */
function detected(key, priority = DEFAULT_PRIORITY) {
	return {
		id: `node-npm:${key}`,
		label: `npm run ${key}`,
		detail: '',
		command: `npm run ${key}`,
		manifest: 'package.json',
		argv: ['npm', 'run', key],
		priority,
		adapter: 'node-npm',
	};
}

/**
 * Assert one action is refused with a 400.
 * @param {() => unknown} action - the call under test.
 * @returns {HttpError} the refusal.
 */
function refusesWith(action) {
	try {
		action();
	} catch (error) {
		assert.ok(error instanceof HttpError, 'expected an HttpError');
		assert.equal(error.status, 400);
		assert.equal(error.code, 'bad-request');
		return error;
	}
	throw new Error('the call was expected to be refused');
}

test('commandId namespaces an adapter-local key', () => {
	assert.equal(commandId('node-npm', 'dev'), 'node-npm:dev');
});

test('slugify always yields a usable id fragment', () => {
	assert.equal(slugify('Start the database'), 'start-the-database');
	assert.equal(slugify('  ***  '), 'command');
	assert.equal(slugify('Ünïcode Ok'), 'unicode-ok');
	assert.ok(slugify('x'.repeat(120)).length <= 40);
});

test('normalizeState drops unknown fields and survives hostile input', () => {
	assert.deepEqual(normalizeState(null), emptyState());
	assert.deepEqual(normalizeState('nonsense'), emptyState());
	assert.deepEqual(normalizeState({ defaultId: 42, hidden: 'no', custom: {} }), emptyState());
	assert.deepEqual(normalizeState({ defaultId: 'a:b', hidden: ['x', 'x', 3], custom: [] }), {
		defaultId: 'a:b',
		hidden: ['x'],
		custom: [],
		overrides: {},
		order: [],
	});
	const custom = normalizeState({
		custom: [
			{ id: 'custom:one', label: 'One', command: 'one' },
			{ id: 'custom:one', label: 'Duplicate id', command: 'two' },
			{ id: 'custom:bad', label: '', command: 'three' },
			{ label: 'No id', command: 'four' },
			null,
		],
	});
	assert.deepEqual(custom.custom, [{ id: 'custom:one', label: 'One', command: 'one', icon: 'default' }]);
});

test('the default is the highest-ranked visible command, then the declared one', () => {
	const commands = [detected('build'), detected('dev', 10), detected('start', 20)];
	const built = buildCommands({ detected: commands, state: emptyState() });
	assert.equal(built.defaultId, 'node-npm:dev', 'adapter priority decides');
	assert.deepEqual(
		built.visible.map((command) => command.id),
		['node-npm:build', 'node-npm:dev', 'node-npm:start'],
		'display order stays detection order',
	);
});

test('manifest order decides when no command is ranked', () => {
	const built = buildCommands({ detected: [detected('a'), detected('b')], state: emptyState() });
	assert.equal(built.defaultId, 'node-npm:a');
});

test('a hidden command leaves the visible list and releases the default', () => {
	const state = { ...emptyState(), defaultId: 'node-npm:dev', hidden: ['node-npm:dev'] };
	const built = buildCommands({ detected: [detected('dev', 10), detected('build')], state });
	assert.equal(built.defaultId, 'node-npm:build');
	assert.deepEqual(
		built.commands.map((command) => [command.id, command.hidden]),
		[
			['node-npm:build', false],
			['node-npm:dev', true],
		],
		'hidden commands are listed last',
	);
});

test('the default is shown first, whatever order things are in', () => {
	const built = buildCommands({ detected: [detected('build'), detected('dev', 10), detected('start', 20)], state: emptyState() });
	assert.deepEqual(
		built.commands.map((command) => command.id),
		['node-npm:dev', 'node-npm:build', 'node-npm:start'],
	);
});

test("the user's order wins over detection order, and the default still leads", () => {
	const state = { ...emptyState(), defaultId: 'node-npm:dev', order: ['node-npm:lint', 'node-npm:dev', 'node-npm:build'] };
	const built = buildCommands({
		detected: [detected('dev', 10), detected('build'), detected('lint')],
		state,
	});
	assert.deepEqual(
		built.commands.map((command) => command.id),
		['node-npm:dev', 'node-npm:lint', 'node-npm:build'],
		'the default is pinned, then the saved order, then anything never moved',
	);
});

test('reordering stores exactly what it is given', () => {
	const state = { ...emptyState(), custom: [{ id: 'custom:x', label: 'X', command: 'x' }] };
	const built = buildCommands({ detected: [detected('dev'), detected('build')], state });
	const next = applyAction(state, { action: 'reorder', order: ['node-npm:build', 'custom:x', 'node-npm:dev'] }, built.commands);
	assert.deepEqual(next.order, ['node-npm:build', 'custom:x', 'node-npm:dev']);
	refusesWith(() => applyAction(state, { action: 'reorder', order: 'node-npm:dev' }, built.commands));
	refusesWith(() => applyAction(state, { action: 'reorder', order: ['node-npm:dev', 'node-npm:dev'] }, built.commands));
	refusesWith(() => applyAction(state, { action: 'reorder', order: ['node-npm:missing'] }, built.commands));
	refusesWith(() => applyAction(state, { action: 'reorder', order: [42] }, built.commands));
});

test('deleting a command forgets where it sat', () => {
	const state = {
		...emptyState(),
		custom: [{ id: 'custom:x', label: 'X', command: 'x' }],
		order: ['custom:x', 'node-npm:dev'],
	};
	const built = buildCommands({ detected: [detected('dev')], state });
	const next = applyAction(state, { action: 'remove-custom', id: 'custom:x' }, built.commands);
	assert.deepEqual(next.order, ['node-npm:dev']);
});

test('user-defined commands join the list after the detected ones', () => {
	const state = {
		...emptyState(),
		custom: [{ id: 'custom:seed', label: 'Seed', command: 'npm run db:seed' }],
	};
	const built = buildCommands({ detected: [detected('dev', 10)], state });
	assert.deepEqual(
		built.commands.map((command) => command.id),
		['node-npm:dev', 'custom:seed'],
	);
	const custom = built.commands[1];
	assert.equal(custom.source, 'custom');
	assert.equal(custom.command, 'npm run db:seed');
	assert.equal(custom.argv, null, 'a user command is a shell line, not argv');
	assert.equal(custom.detail, '', 'a user command needs no separate detail');
});

test('the wire payload carries display facts only', () => {
	const built = buildCommands({ detected: [detected('dev')], state: emptyState() });
	const payload = commandPayload(built.commands[0]);
	assert.deepEqual(Object.keys(payload).sort(), [
		'adapter',
		'command',
		'detail',
		'hidden',
		'icon',
		'id',
		'label',
		'manifest',
		'source',
	]);
	assert.equal('argv' in payload, false, 'the browser never sends a program back');
	assert.equal('priority' in payload, false);
});

test('applyAction sets, hides, shows, adds, and removes', () => {
	const built = buildCommands({
		detected: [detected('dev', 10), detected('build')],
		state: emptyState(),
	});
	let state = emptyState();

	state = applyAction(state, { action: 'set-default', id: 'node-npm:build' }, built.commands);
	assert.equal(state.defaultId, 'node-npm:build');

	state = applyAction(state, { action: 'hide', id: 'node-npm:build' }, built.commands);
	assert.deepEqual(state.hidden, ['node-npm:build']);
	assert.equal(state.defaultId, null, 'hiding the default releases it');

	state = applyAction(state, { action: 'show', id: 'node-npm:build' }, built.commands);
	assert.deepEqual(state.hidden, []);

	state = applyAction(state, { action: 'add-custom', label: 'Start the database', command: 'docker compose up -d' }, built.commands);
	assert.deepEqual(state.custom, [
		{
			id: 'custom:start-the-database',
			label: 'Start the database',
			command: 'docker compose up -d',
			icon: 'default',
		},
	]);

	state = applyAction(state, { action: 'add-custom', label: 'Start the database', command: 'again' }, [
		...built.commands,
		{ id: 'custom:start-the-database', source: 'custom', hidden: false },
	]);
	assert.equal(state.custom[1].id, 'custom:start-the-database-2', 'ids never collide');

	state = applyAction(state, { action: 'remove-custom', id: 'custom:start-the-database' }, built.commands);
	assert.equal(state.custom.length, 1);
});

test('applyAction refuses actions that contradict the model', () => {
	const built = buildCommands({ detected: [detected('dev')], state: emptyState() });
	const custom = { ...emptyState(), custom: [{ id: 'custom:seed', label: 'Seed', command: 'seed' }] };
	const withCustom = buildCommands({ detected: [detected('dev')], state: custom });

	const refuses = (action, commands = built.commands) => {
		refusesWith(() => applyAction(emptyState(), action, commands));
	};

	refuses({ action: 'set-default', id: 'node-npm:missing' });
	refuses({ action: 'hide', id: 'node-npm:missing' });
	refuses({ action: 'show', id: 'node-npm:dev' }, built.commands);
	refuses({ action: 'hide', id: 'custom:seed' }, withCustom.commands);
	refuses({ action: 'remove-custom', id: 'node-npm:dev' });
	refuses({ action: 'add-custom', label: '', command: 'x' });
	refuses({ action: 'add-custom', label: 'x', command: '   ' });
	refuses({ action: 'add-custom', label: 'x'.repeat(61), command: 'x' });
	refuses({ action: 'add-custom', label: 'x', command: 'y'.repeat(501) });
	refuses({ action: 'add-custom', label: 'x', command: 'broken\u0000command' });
	refuses({ action: 'nonsense' });
	refuses({});
});

test('a project cannot define unbounded commands', () => {
	const full = {
		...emptyState(),
		custom: Array.from({ length: 20 }, (_, index) => ({
			id: `custom:c${index}`,
			label: `c${index}`,
			command: 'true',
		})),
	};
	const built = buildCommands({ detected: [], state: full });
	refusesWith(() => applyAction(full, { action: 'add-custom', label: 'one more', command: 'true' }, built.commands));
});

test('every command wears the default icon until one is chosen', () => {
	const built = buildCommands({ detected: [detected('dev')], state: emptyState() });
	assert.equal(DEFAULT_ICON, 'default');
	assert.equal(built.commands[0].icon, 'default');
	assert.equal(commandPayload(built.commands[0]).icon, 'default');
});

test('the manifest that declared a command travels to the browser', () => {
	const built = buildCommands({ detected: [detected('dev')], state: emptyState() });
	assert.equal(commandPayload(built.commands[0]).manifest, 'package.json');
	const custom = buildCommands({
		detected: [],
		state: { ...emptyState(), custom: [{ id: 'custom:x', label: 'X', command: 'x' }] },
	});
	assert.equal(commandPayload(custom.commands[0]).manifest, '', 'user commands have no manifest');
});

test('a stored override renames a detected command and survives normalization', () => {
	const state = normalizeState({
		overrides: {
			'node-npm:dev': { label: 'Arrancar el front', icon: 'sparkle' },
			'node-npm:lint': { label: '' },
			'node-npm:test': { icon: 'not-an-icon' },
			'': { label: 'no id' },
			'node-npm:build': 'nonsense',
		},
	});
	assert.deepEqual(state.overrides, {
		'node-npm:dev': { label: 'Arrancar el front', icon: 'sparkle' },
	});
	const built = buildCommands({ detected: [detected('dev')], state });
	assert.equal(built.commands[0].label, 'Arrancar el front');
	assert.equal(built.commands[0].icon, 'sparkle');
	assert.equal(built.commands[0].baseLabel, 'npm run dev', 'the adapter label stays recoverable');
});

test('editing a detected command stores only what changed', () => {
	const built = buildCommands({ detected: [detected('dev')], state: emptyState() });
	let state = applyAction(
		{ ...emptyState() },
		{ action: 'edit', id: 'node-npm:dev', label: 'Front', icon: 'play' },
		built.commands,
	);
	assert.deepEqual(state.overrides['node-npm:dev'], { label: 'Front', icon: 'play' });

	// Restoring the adapter's label and the default icon drops the override
	// instead of leaving a no-op behind.
	state = applyAction(state, { action: 'edit', id: 'node-npm:dev', label: 'npm run dev', icon: 'default' }, built.commands);
	assert.deepEqual(state.overrides, {});

	const renamed = buildCommands({ detected: [detected('dev')], state: {
		...emptyState(),
		overrides: { 'node-npm:dev': { label: 'Front' } },
	} });
	assert.equal(renamed.commands[0].icon, 'default', 'a rename leaves the icon alone');
});

test('editing a user-defined command changes its text and icon', () => {
	const state = {
		...emptyState(),
		custom: [{ id: 'custom:seed', label: 'Seed', command: 'npm run db:seed', icon: 'database' }],
	};
	const built = buildCommands({ detected: [], state });
	const next = applyAction(
		state,
		{ action: 'edit', id: 'custom:seed', label: 'Seed the database', command: 'npm run db:seed --fresh', icon: 'data' },
		built.commands,
	);
	assert.deepEqual(next.custom, [
		{
			id: 'custom:seed',
			label: 'Seed the database',
			command: 'npm run db:seed --fresh',
			icon: 'data',
		},
	]);
});

test('icons are validated against the published set', () => {
	assert.ok(ICON_IDS.includes('default'));
	assert.ok(ICON_IDS.length > 8, 'the picker offers a real choice');
	const built = buildCommands({ detected: [detected('dev')], state: emptyState() });
	refusesWith(() => applyAction(emptyState(), { action: 'edit', id: 'node-npm:dev', label: 'x', icon: 'nope' }, built.commands));
	refusesWith(() => applyAction(emptyState(), { action: 'add-custom', label: 'x', command: 'y', icon: 'nope' }, built.commands));
	const added = applyAction(emptyState(), { action: 'add-custom', label: 'x', command: 'y', icon: 'gauge' }, built.commands);
	assert.equal(added.custom[0].icon, 'gauge');
	const plain = applyAction(emptyState(), { action: 'add-custom', label: 'x', command: 'y' }, built.commands);
	assert.equal(plain.custom[0].icon, 'default', 'an absent icon is the default');
});

test('editing an unknown command is refused', () => {
	const built = buildCommands({ detected: [detected('dev')], state: emptyState() });
	refusesWith(() => applyAction(emptyState(), { action: 'edit', id: 'node-npm:missing', label: 'x' }, built.commands));
});
