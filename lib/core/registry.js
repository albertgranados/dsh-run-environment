/**
 * The adapter registry: the one place that knows what an environment adapter is.
 *
 * An adapter answers a single question — "given this workspace, which commands
 * can be run here?" — and nothing else. It never spawns anything, never talks
 * to the browser, and never sees a preference. That narrowness is what keeps
 * adding a language a self-contained change; `docs/adapters.md` is the contract
 * and the worked example.
 *
 * @module dsh-run-environment/core/registry
 */

import { DEFAULT_PRIORITY, commandId } from './model.js';

/**
 * One command an adapter detected.
 *
 * @typedef {object} DetectedCommand
 * @property {string} id - adapter-local key, unique within the adapter.
 * @property {string} label - short menu label; defaults to the argv text.
 * @property {string} [detail] - secondary text (usually the underlying command).
 * @property {readonly string[]} argv - exact argv to spawn; `argv[0]` is a bare
 * PATH program name or an absolute path, resolved by the runner.
 * @property {number} [priority] - lower runs first and wins the default;
 * defaults to {@link DEFAULT_PRIORITY}.
 */

/**
 * One environment adapter.
 *
 * @typedef {object} Adapter
 * @property {string} id - stable lowercase id (`node-npm`), unique in the registry.
 * @property {string} title - human name shown in the menu section header.
 * @property {readonly string[]} watch - workspace-relative paths whose change
 * invalidates this adapter's detection.
 * @property {(context: {workspace: import('./workspace.js').Workspace}) => Promise<readonly DetectedCommand[]>} detect
 * - the detection itself; returning an empty list means "not this environment".
 */

/** Adapter ids accepted by the registry. */
const ADAPTER_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
/** Detected keys accepted from an adapter. */
const COMMAND_KEY = /^[^\s"'`$;&|<>\\\u0000-\u001f]{1,128}$/;
/** Detection cache entries kept before the oldest is dropped. */
const CACHE_LIMIT = 64;

/** The adapter registry: registration, ordered detection, and change caching. */
export class AdapterRegistry {
	/** @type {Map<string, Adapter>} */
	adapters = new Map();
	/** @type {Map<string, {fingerprint: string, commands: object[]}>} */
	cache = new Map();

	/**
	 * @param {{logger?: {warn?: (message: string) => void} | null}} [options] - diagnostic sink.
	 */
	constructor({ logger = null } = {}) {
		this.logger = logger;
	}

	/**
	 * Add one adapter. Registration order is display order.
	 * @param {Adapter} adapter - the adapter.
	 * @returns {this} the registry, for chaining.
	 * @throws {Error} when the adapter is malformed or its id is taken.
	 */
	register(adapter) {
		assertAdapter(adapter);
		if (this.adapters.has(adapter.id)) throw new Error(`adapter already registered: ${adapter.id}`);
		this.adapters.set(adapter.id, adapter);
		this.cache.clear();
		return this;
	}

	/**
	 * Registered adapter ids, in display order.
	 * @returns {string[]} the ids.
	 */
	ids() {
		return [...this.adapters.keys()];
	}

	/**
	 * Every path any adapter watches, de-duplicated and sorted.
	 * @returns {string[]} workspace-relative paths.
	 */
	watchPaths() {
		return [...new Set([...this.adapters.values()].flatMap((adapter) => [...adapter.watch]))].sort();
	}

	/**
	 * Run every adapter against one workspace.
	 *
	 * A failing adapter is logged and skipped: one broken environment can never
	 * hide the commands the others found. Results are cached per directory until
	 * a watched path changes.
	 *
	 * @param {import('./workspace.js').Workspace} workspace - the project.
	 * @returns {Promise<object[]>} every detected command, in adapter then detection order.
	 */
	async detect(workspace) {
		const adapters = [...this.adapters.values()];
		const fingerprint = await workspace.fingerprint(this.watchPaths());
		const cached = this.cache.get(workspace.directory);
		if (cached !== undefined && cached.fingerprint === fingerprint) return cached.commands;
		const commands = [];
		for (const adapter of adapters) {
			try {
				const detected = await adapter.detect({ workspace });
				for (const [index, entry] of [...detected].entries()) commands.push(normalize(adapter, entry, index));
			} catch (error) {
				this.logger?.warn?.(
					`dsh-run-environment: adapter ${adapter.id} failed on ${workspace.directory}: ${describe(error)}`,
				);
			}
		}
		if (this.cache.size >= CACHE_LIMIT) {
			const oldest = this.cache.keys().next();
			if (oldest.done !== true) this.cache.delete(oldest.value);
		}
		this.cache.set(workspace.directory, { fingerprint, commands });
		return commands;
	}
}

/**
 * Validate one adapter before it can be registered.
 * @param {unknown} adapter - claimed adapter.
 * @throws {Error} when a field is missing or malformed.
 */
function assertAdapter(adapter) {
	if (typeof adapter !== 'object' || adapter === null) throw new Error('adapter must be an object');
	if (typeof adapter.id !== 'string' || !ADAPTER_ID.test(adapter.id)) {
		throw new Error(`adapter id must match ${String(ADAPTER_ID)}`);
	}
	if (typeof adapter.title !== 'string' || adapter.title === '') throw new Error(`adapter ${adapter.id} needs a title`);
	if (!Array.isArray(adapter.watch) || adapter.watch.some((path) => typeof path !== 'string')) {
		throw new Error(`adapter ${adapter.id} watch must be a string array`);
	}
	if (typeof adapter.detect !== 'function') throw new Error(`adapter ${adapter.id} needs a detect function`);
}

/**
 * Turn one adapter result into a model command, namespacing its id.
 * @param {Adapter} adapter - owning adapter.
 * @param {unknown} entry - claimed detected command.
 * @param {number} index - position within the adapter's result.
 * @returns {object} the model command.
 * @throws {Error} when the entry cannot be run at all.
 */
function normalize(adapter, entry, index) {
	const key = typeof entry?.id === 'string' && COMMAND_KEY.test(entry.id) ? entry.id : null;
	if (key === null) throw new Error(`adapter ${adapter.id} produced an unusable command key at index ${index}`);
	const argv = Array.isArray(entry.argv) ? entry.argv.filter((part) => typeof part === 'string' && part !== '') : [];
	if (argv.length === 0) throw new Error(`adapter ${adapter.id} produced ${key} without argv`);
	const label = typeof entry.label === 'string' && entry.label !== '' ? entry.label : argv.join(' ');
	return {
		id: commandId(adapter.id, key),
		label,
		detail: typeof entry.detail === 'string' ? entry.detail : '',
		command: argv.join(' '),
		argv: [...argv],
		priority: Number.isFinite(entry.priority) ? entry.priority : DEFAULT_PRIORITY,
		adapter: adapter.id,
	};
}

/**
 * One-line description of a thrown value.
 * @param {unknown} error - thrown value.
 * @returns {string} the message.
 */
function describe(error) {
	return error instanceof Error ? error.message : String(error);
}
