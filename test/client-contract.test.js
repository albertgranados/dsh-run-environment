import assert from 'node:assert/strict';
import test from 'node:test';

import { ICON_IDS } from '../lib/core/model.js';

/** Every icon/components export the bundle may destructure. */
const primitiveNames = [
	'Button',
	'Input',
	'Menu',
	'Modal',
	'Pill',
	'StateDot',
	'Tooltip',
	'IconAlarmClockOutline16',
	'IconApiOutline14',
	'IconBranchOutline16',
	'IconCheckOutline16',
	'IconChecklistOutline14',
	'IconChevronDownOutline14',
	'IconCodeOutline16',
	'IconCordisPluginOutline14',
	'IconDataOutline16',
	'IconDatabaseOutline16',
	'IconEditOutline16',
	'IconEllipsisOutline16',
	'IconFolderOpenOutline16',
	'IconGaugeOutline16',
	'IconGlobeOutline14',
	'IconLoadingOutline16',
	'IconPlayOutline16',
	'IconPlusOutline16',
	'IconRefreshOutline16',
	'IconSparkle16',
	'IconTrashOutline16',
	'IconWarningOutline16',
];

/** A React stand-in: enough for module scope, never asked to render. */
const react = {
	createElement: () => null,
	Fragment: 'Fragment',
	useCallback: (callback) => callback,
	useEffect: () => {},
	useMemo: (compute) => compute(),
	useRef: () => ({ current: undefined }),
	useState: (initial) => [initial, () => {}],
};

/**
 * Load the browser bundle the way the harness does: install the loader on
 * `window`, import the file, and keep the registration it publishes.
 * @returns {Promise<object>} the registration.
 */
async function loadBundle() {
	/** @type {object | null} */
	let registration = null;
	const styleTags = [];
	globalThis.window = {
		__ModuleLoader__: {
			load: (definition) => {
				registration = definition;
			},
		},
	};
	globalThis.document = {
		querySelector: () => null,
		createElement: () => ({ dataset: {} }),
		head: { appendChild: (tag) => styleTags.push(tag) },
	};
	await import(`../lib/client.js?cache-bust=${String(Math.random())}`);
	assert.ok(registration !== null, 'the bundle registered itself with the module loader');
	return { registration, styleTags };
}

test('the client bundle registers under the package name', async () => {
	const { registration } = await loadBundle();
	assert.equal(registration.id, 'dsh-run-environment');
	assert.equal(typeof registration.factory, 'function');
});

test('the factory exports the cordis plugin contract and injects its stylesheet', async () => {
	const { registration, styleTags } = await loadBundle();
	const loaded = registration.factory((specifier) => {
		if (specifier === 'react') return react;
		if (specifier === '@deepseek-ai/dsh-client-ui-primitives') {
			return Object.fromEntries(primitiveNames.map((name) => [name, () => null]));
		}
		throw new Error(`unexpected require: ${specifier}`);
	});
	assert.equal(typeof loaded.apply, 'function');
	assert.deepEqual(loaded.inject, ['sessions', 'slots', 'locale']);
	assert.equal(styleTags.length, 1, 'the stylesheet is injected exactly once');
	assert.equal(styleTags[0].dataset.plugin, 'dsh-run-environment');
	assert.match(styleTags[0].textContent, /RUNENV_split/);
});

test('the picker knows every icon the host validates against', async () => {
	const { registration } = await loadBundle();
	const loaded = registration.factory((specifier) => {
		if (specifier === 'react') return react;
		if (specifier === '@deepseek-ai/dsh-client-ui-primitives') {
			return Object.fromEntries(primitiveNames.map((name) => [name, () => null]));
		}
		throw new Error(`unexpected require: ${specifier}`);
	});
	for (const icon of ICON_IDS) {
		assert.ok(
			loaded.__icons.includes(icon),
			`the host offers "${icon}" but the browser half cannot draw it`,
		);
	}
});

test('apply registers key-identical dictionaries and one header slot', async () => {
	const { registration } = await loadBundle();
	const loaded = registration.factory((specifier) => {
		if (specifier === 'react') return react;
		if (specifier === '@deepseek-ai/dsh-client-ui-primitives') {
			return Object.fromEntries(primitiveNames.map((name) => [name, () => null]));
		}
		throw new Error(`unexpected require: ${specifier}`);
	});

	/** @type {object | null} */
	let dictionaries = null;
	/** @type {{entry: object, component: unknown} | null} */
	let slot = null;
	/** @type {object[]} callbacks cordis would run once a service appears. */
	const pendingInjects = [];
	const context = {
		effect: (body) => {
			body();
		},
		inject: (deps, callback) => {
			pendingInjects.push({ deps, callback });
			return () => {};
		},
		locale: {
			register: (namespace, dicts) => {
				dictionaries = { namespace, dicts };
				return () => {};
			},
			bind: (namespace) => (key) => `${namespace}:${key}`,
		},
		slots: {
			inject: (name, register) => register(name),
			register: (entry, component) => {
				slot = { entry, component };
			},
		},
	};
	loaded.apply(context);

	assert.equal(dictionaries.namespace, 'run-environment');
	const locales = Object.keys(dictionaries.dicts).sort();
	assert.deepEqual(locales, ['en', 'es', 'zh']);
	const reference = Object.keys(dictionaries.dicts.zh).sort();
	for (const locale of locales) {
		assert.deepEqual(Object.keys(dictionaries.dicts[locale]).sort(), reference, `${locale} must be key-identical`);
	}
	for (const [key, value] of Object.entries(dictionaries.dicts.zh)) {
		assert.equal(typeof value, 'string', `${key} must be a template string`);
	}

	// The run console rides the Sidebar's own public two-stage path: the type into
	// the registry, the body and the chip into their keyed seats under its id.
	const types = [];
	const seats = [];
	const rightContext = {
		effect: (body) => {
			body();
		},
		sidebarRight: { openResource: () => {} },
		sidebarRightTabs: {
			register: (definition) => {
				types.push(definition);
				return () => {};
			},
		},
		slots: {
			inject: (name, register) => register(name),
			register: (entry, component) => {
				seats.push({ entry, component });
			},
		},
	};
	for (const pending of pendingInjects) {
		if (pending.deps.includes('sidebarRightTabs')) pending.callback(rightContext);
	}
	assert.equal(types.length, 1, 'one tab type is registered');
	assert.equal(types[0].kind, 'run-console');
	assert.deepEqual(types[0].patterns, ['dsh-resource://run-console/**']);
	assert.equal(typeof types[0].title('dsh-resource://run-console/x/y'), 'string');
	const seatNames = seats.map((seat) => seat.entry.name).sort();
	assert.deepEqual(seatNames, ['sidebar.right.pane.tab', 'sidebar.right.pane.tab.title']);
	for (const seat of seats) {
		assert.equal(seat.entry.key, types[0].id, 'the seats are keyed by the type id');
		assert.equal(typeof seat.component, 'function');
	}

	assert.ok(slot !== null, 'the header slot was registered');
	assert.equal(slot.entry.name, 'conversation.session.header.utilities');
	assert.equal(slot.entry.id, 'run-environment');
	assert.equal(slot.entry.locale, 'run-environment');
	assert.equal(slot.entry.order, -20);
	assert.equal(typeof slot.component, 'function');
});
