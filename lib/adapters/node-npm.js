/**
 * The Node.js adapter: `package.json` scripts, run through npm.
 *
 * This is the reference adapter — the smallest complete implementation of the
 * contract in `docs/adapters.md`. It reads one manifest, ranks the conventional
 * entry points so the play button lands on something useful, and leaves
 * lifecycle companions out of the menu.
 *
 * @module dsh-run-environment/adapters/node-npm
 */

/** Priority that makes `dev` the default whenever a project declares it. */
const DEV_PRIORITY = 10;
/** Priority of `start`, the conventional entry point for an application. */
const START_PRIORITY = 20;
/** `/^(pre|post)(.+)$/` companions of another declared script. */
const LIFECYCLE_COMPANION = /^(?:pre|post)(.+)$/;
/** Script keys npm can address: no whitespace, quotes, or shell metacharacters. */
const SCRIPT_KEY = /^[^\s"'`$;&|<>\\\u0000-\u001f]{1,128}$/;

/**
 * The Node.js/npm environment adapter.
 *
 * @type {import('../core/registry.js').Adapter}
 */
export const nodeNpmAdapter = {
	id: 'node-npm',
	title: 'Node.js · npm',
	watch: ['package.json'],

	/**
	 * Detect the scripts a `package.json` declares.
	 * @param {{workspace: import('../core/workspace.js').Workspace}} context - the project.
	 * @returns {Promise<import('../core/registry.js').DetectedCommand[]>} one command per runnable script.
	 */
	async detect({ workspace }) {
		const manifest = await workspace.readJson('package.json');
		const scripts = manifest?.scripts;
		if (typeof scripts !== 'object' || scripts === null || Array.isArray(scripts)) return [];
		const names = Object.keys(scripts).filter(
			(name) => SCRIPT_KEY.test(name) && typeof scripts[name] === 'string' && scripts[name].trim() !== '',
		);
		return names
			.filter((name) => !isLifecycleCompanion(name, names))
			.map((name) => ({
				id: name,
				label: `npm run ${name}`,
				detail: scripts[name],
				argv: ['npm', 'run', name],
				priority: priorityOf(name),
			}));
	},
};

/**
 * Whether a script exists only to bracket another one: npm runs `pre<name>` and
 * `post<name>` on its own, so offering them is double-launching a user's work.
 * @param {string} name - script name.
 * @param {readonly string[]} names - every declared script name.
 * @returns {boolean} true when the name is a lifecycle companion.
 */
function isLifecycleCompanion(name, names) {
	const match = LIFECYCLE_COMPANION.exec(name);
	return match !== null && names.includes(match[1]);
}

/**
 * Rank one script for the default-selection rule (`dev`, then `start`, then
 * manifest order).
 * @param {string} name - script name.
 * @returns {number} the priority; lower wins.
 */
function priorityOf(name) {
	if (name === 'dev') return DEV_PRIORITY;
	if (name === 'start') return START_PRIORITY;
	return undefined;
}
