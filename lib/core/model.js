/**
 * The command model: how adapter detections and one project's stored
 * preferences become the ordered, runnable command list the Session header
 * renders.
 *
 * Everything here is pure — no filesystem, no harness, no browser — so the
 * rules that decide what a user sees and what a click runs are testable on
 * their own. `docs/architecture.md` describes where this sits.
 *
 * @module dsh-run-environment/core/model
 */

import { badRequest } from './errors.js';

/** Ranking used by adapters that do not rank their own commands. */
export const DEFAULT_PRIORITY = 100;
/** Adapter id reserved for user-defined commands. */
export const CUSTOM_ADAPTER = 'custom';
/** Maximum user-defined commands per project. */
export const MAX_CUSTOM_COMMANDS = 20;
/** Maximum length of a user-defined command string. */
export const MAX_COMMAND_LENGTH = 500;
/** Maximum length of a label, whether user-defined or an override. */
export const MAX_LABEL_LENGTH = 60;
/** Maximum length of the optional description that explains a command. */
export const MAX_DESCRIPTION_LENGTH = 160;
/** Maximum entries accepted in one project's saved order. */
export const MAX_ORDER = 500;

/**
 * The icon every command wears until someone picks another one. `default` is
 * drawn by the browser half as a neutral glyph, so it has no component name.
 */
export const DEFAULT_ICON = 'default';

/**
 * The icon set the browser half can draw, in picker order. The host validates
 * stored and requested values against this list, and serves it to the browser,
 * so a state file can never ask for an icon that does not exist.
 */
export const ICON_IDS = Object.freeze([
	DEFAULT_ICON,
	'play',
	'sparkle',
	'code',
	'database',
	'globe',
	'folder',
	'clock',
	'branch',
	'api',
	'gauge',
	'plugin',
	'checklist',
	'refresh',
	'warning',
	'data',
]);

/**
 * Build the identity a command is addressed by: `${adapter}:${key}`.
 * @param {string} adapterId - owning adapter id.
 * @param {string} key - adapter-local key.
 * @returns {string} the command id.
 */
export function commandId(adapterId, key) {
	return `${adapterId}:${key}`;
}

/**
 * Lowercase, dash-separated form of a label, used to build readable custom ids.
 * @param {unknown} value - source text.
 * @returns {string} the slug, never empty.
 */
export function slugify(value) {
	const slug = String(value)
		.toLowerCase()
		.normalize('NFKD')
		// Strip the combining marks NFKD just separated, so "Configuración"
		// slugs to `configuracion` rather than `configuracio-n`.
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug === '' ? 'command' : slug.slice(0, 40);
}

/**
 * The empty preference document for a project.
 * @returns {{defaultId: string | null, hidden: string[], custom: object[], overrides: Record<string, object>}} the document.
 */
export function emptyState() {
	return { defaultId: null, hidden: [], custom: [], overrides: {}, order: [] };
}

/**
 * Coerce untrusted stored JSON into a valid preference document. Unknown fields
 * are dropped, wrong types fall back to the empty document, and oversized
 * values are truncated, so a hand-edited or truncated state file can never take
 * the header down.
 * @param {unknown} raw - value read from the state file.
 * @returns {object} a fresh document.
 */
export function normalizeState(raw) {
	const state = emptyState();
	if (typeof raw !== 'object' || raw === null) return state;
	if (typeof raw.defaultId === 'string' && raw.defaultId !== '') state.defaultId = raw.defaultId;
	if (Array.isArray(raw.hidden)) {
		state.hidden = [...new Set(raw.hidden.filter((id) => typeof id === 'string' && id !== ''))];
	}
	if (Array.isArray(raw.custom)) {
		const seen = new Set();
		for (const entry of raw.custom) {
			if (typeof entry !== 'object' || entry === null) continue;
			const { id, label, command, icon, description } = entry;
			if (typeof id !== 'string' || id === '' || seen.has(id)) continue;
			if (typeof label !== 'string' || typeof command !== 'string') continue;
			if (label.trim() === '' || command.trim() === '') continue;
			seen.add(id);
			state.custom.push({
				id,
				label: label.slice(0, MAX_LABEL_LENGTH),
				command: command.slice(0, MAX_COMMAND_LENGTH),
				icon: acceptedIcon(icon),
				description: typeof description === 'string' ? description.trim().slice(0, MAX_DESCRIPTION_LENGTH) : '',
			});
			if (state.custom.length >= MAX_CUSTOM_COMMANDS) break;
		}
	}
	if (Array.isArray(raw.order)) {
		state.order = [...new Set(raw.order.filter((id) => typeof id === 'string' && id !== ''))].slice(0, MAX_ORDER);
	}
	if (typeof raw.overrides === 'object' && raw.overrides !== null && !Array.isArray(raw.overrides)) {
		for (const [id, patch] of Object.entries(raw.overrides)) {
			if (id === '' || typeof patch !== 'object' || patch === null) continue;
			const override = {};
			if (typeof patch.label === 'string' && patch.label.trim() !== '') {
				override.label = patch.label.trim().slice(0, MAX_LABEL_LENGTH);
			}
			if (typeof patch.description === 'string' && patch.description.trim() !== '') {
				override.description = patch.description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
			}
			const icon = acceptedIcon(patch.icon);
			if (icon !== DEFAULT_ICON) override.icon = icon;
			if (Object.keys(override).length > 0) state.overrides[id] = override;
		}
	}
	return state;
}

/**
 * Merge detections with stored preferences into the ordered runnable list.
 *
 * Ordering is by adapter priority and then by detection order, which is what
 * makes `dev` win over `start` over "whatever the manifest listed first"
 * without the model knowing anything about Node.js. Per-command overrides
 * (a renamed command, a chosen icon) are folded in here, so the rest of the
 * host only ever sees the resolved shape.
 *
 * @param {{detected: readonly object[], state: object}} input - detections and preferences.
 * @returns {{commands: object[], visible: object[], defaultId: string | null}} the model.
 */
export function buildCommands({ detected, state }) {
	const hidden = new Set(state.hidden);
	const natural = [
		...detected.map((command) => {
			const override = state.overrides[command.id] ?? {};
			return {
				...command,
				// The adapter's own label, kept so an edit that restores it can drop
				// the override instead of storing a no-op.
				baseLabel: command.label,
				label: override.label ?? command.label,
				icon: override.icon ?? DEFAULT_ICON,
				description: override.description ?? '',
				source: 'detected',
				hidden: hidden.has(command.id),
			};
		}),
		...state.custom.map((entry) => ({
			id: entry.id,
			label: entry.label,
			command: entry.command,
			// A user command IS its command text, so it carries no separate detail.
			detail: '',
			manifest: '',
			icon: entry.icon ?? DEFAULT_ICON,
			description: entry.description ?? '',
			argv: null,
			priority: DEFAULT_PRIORITY,
			adapter: CUSTOM_ADAPTER,
			source: 'custom',
			hidden: false,
		})),
	];
	const visible = natural.filter((command) => !command.hidden);
	const declared = visible.find((command) => command.id === state.defaultId);
	// The default is still chosen by adapter priority, never by where a command was
	// dragged to.
	const ranked = visible
		.map((command, index) => ({ command, index }))
		.sort((left, right) => left.command.priority - right.command.priority || left.index - right.index);
	const defaultId = declared?.id ?? ranked[0]?.command.id ?? null;
	return { commands: orderForDisplay(natural, { defaultId, order: state.order }), visible, defaultId };
}

/**
 * The order a menu shows: the default pinned first, then the order the user
 * dragged things into, then the order they were detected in, with hidden
 * commands always last so they never sit among the runnable ones.
 * @param {readonly object[]} commands - commands in their natural order.
 * @param {{defaultId: string | null, order: readonly string[]}} preference - the pinned default and the saved order.
 * @returns {object[]} a new array in display order.
 */
function orderForDisplay(commands, { defaultId, order }) {
	const natural = new Map(commands.map((command, index) => [command.id, index]));
	const preferred = new Map(order.map((id, index) => [id, index]));
	// Anything the user never moved keeps its natural order, after everything that
	// was moved.
	const base = commands.length;
	const weight = (command) => preferred.get(command.id) ?? base + natural.get(command.id);
	return [...commands].sort((left, right) => {
		const hidden = (left.hidden ? 1 : 0) - (right.hidden ? 1 : 0);
		if (hidden !== 0) return hidden;
		if (left.hidden === false) {
			const pinned = (left.id === defaultId ? 0 : 1) - (right.id === defaultId ? 0 : 1);
			if (pinned !== 0) return pinned;
		}
		return weight(left) - weight(right);
	});
}

/**
 * Project one command onto the wire. Execution facts (`argv`, `priority`) stay
 * on the host: the browser never sends a program back to be spawned.
 * @param {object} command - model command.
 * @returns {object} the wire shape.
 */
export function commandPayload(command) {
	return {
		id: command.id,
		label: command.label,
		command: command.command,
		detail: command.detail ?? '',
		description: command.description ?? '',
		manifest: command.manifest ?? '',
		icon: command.icon ?? DEFAULT_ICON,
		source: command.source,
		adapter: command.adapter,
		hidden: command.hidden === true,
	};
}

/**
 * Validate one state action against the built model and apply it.
 * @param {object} state - current normalized preferences.
 * @param {unknown} action - untrusted action object from the wire.
 * @param {readonly object[]} commands - every command of the built model.
 * @returns {object} the next preference document.
 * @throws {import('./errors.js').HttpError} 400 when the action is unknown or inconsistent.
 */
export function applyAction(state, action, commands) {
	const type = typeof action === 'object' && action !== null ? action.action : undefined;
	const next = {
		defaultId: state.defaultId,
		hidden: [...state.hidden],
		custom: state.custom.map((entry) => ({ ...entry })),
		overrides: { ...state.overrides },
		order: [...state.order],
	};
	/** @param {unknown} id - claimed command id. */
	const find = (id) => commands.find((command) => command.id === id);
	switch (type) {
		case 'set-default': {
			const command = find(action.id);
			if (command === undefined) throw badRequest(`unknown command: ${String(action.id)}`);
			if (command.hidden) throw badRequest(`command is hidden: ${command.id}`);
			next.defaultId = command.id;
			break;
		}
		case 'hide': {
			const command = find(action.id);
			if (command === undefined) throw badRequest(`unknown command: ${String(action.id)}`);
			if (command.source !== 'detected') throw badRequest('user-defined commands are deleted, not hidden');
			if (!next.hidden.includes(command.id)) next.hidden.push(command.id);
			if (next.defaultId === command.id) next.defaultId = null;
			break;
		}
		case 'show': {
			const index = next.hidden.indexOf(action.id);
			if (index === -1) throw badRequest(`command is not hidden: ${String(action.id)}`);
			next.hidden.splice(index, 1);
			break;
		}
		case 'add-custom': {
			if (next.custom.length >= MAX_CUSTOM_COMMANDS) {
				throw badRequest(`a project can define at most ${MAX_CUSTOM_COMMANDS} commands`);
			}
			const label = requireText(action.label, MAX_LABEL_LENGTH, 'label');
			const command = requireText(action.command, MAX_COMMAND_LENGTH, 'command');
			next.custom.push({
				id: uniqueCustomId(next.custom, label),
				label,
				command,
				icon: requireIcon(action.icon),
				description: optionalText(action.description, MAX_DESCRIPTION_LENGTH, 'description'),
			});
			break;
		}
		case 'edit': {
			const command = find(action.id);
			if (command === undefined) throw badRequest(`unknown command: ${String(action.id)}`);
			if (command.source === 'custom') {
				const entry = next.custom.find((candidate) => candidate.id === command.id);
				if (entry === undefined) throw badRequest(`unknown user-defined command: ${command.id}`);
				entry.label = requireText(action.label, MAX_LABEL_LENGTH, 'label');
				entry.icon = requireIcon(action.icon);
				entry.description = optionalText(action.description, MAX_DESCRIPTION_LENGTH, 'description');
				// A user command's text is theirs to change; a detected command's
				// command line belongs to the manifest.
				if (action.command !== undefined) {
					entry.command = requireText(action.command, MAX_COMMAND_LENGTH, 'command');
				}
				break;
			}
			const override = { ...next.overrides[command.id] };
			const label = requireText(action.label, MAX_LABEL_LENGTH, 'label');
			// An override that matches the adapter's own label is dropped, so the
			// state file only records what the user actually changed.
			if (label === command.baseLabel) delete override.label;
			else override.label = label;
			const icon = requireIcon(action.icon);
			if (icon === DEFAULT_ICON) delete override.icon;
			else override.icon = icon;
			// A detected command has no description of its own, so an empty one
			// simply leaves no override behind.
			const description = optionalText(action.description, MAX_DESCRIPTION_LENGTH, 'description');
			if (description === '') delete override.description;
			else override.description = description;
			if (Object.keys(override).length === 0) delete next.overrides[command.id];
			else next.overrides[command.id] = override;
			break;
		}
		case 'reorder': {
			if (!Array.isArray(action.order)) throw badRequest('order must be an array of command ids');
			if (action.order.length > MAX_ORDER) throw badRequest(`order must have at most ${MAX_ORDER} entries`);
			const seen = new Set();
			for (const id of action.order) {
				if (typeof id !== 'string' || id === '') throw badRequest('every order entry must be a command id');
				if (seen.has(id)) throw badRequest(`order lists ${id} twice`);
				if (!commands.some((command) => command.id === id)) throw badRequest(`unknown command: ${id}`);
				seen.add(id);
			}
			next.order = [...action.order];
			break;
		}
		case 'remove-custom': {
			const index = next.custom.findIndex((entry) => entry.id === action.id);
			if (index === -1) throw badRequest(`unknown user-defined command: ${String(action.id)}`);
			next.custom.splice(index, 1);
			next.order = next.order.filter((id) => id !== action.id);
			if (next.defaultId === action.id) next.defaultId = null;
			break;
		}
		default:
			throw badRequest(`unknown action: ${String(type)}`);
	}
	return next;
}

/**
 * One trimmed, length-bounded, control-free text field from the wire.
 * @param {unknown} value - claimed field value.
 * @param {number} max - accepted length.
 * @param {string} field - field name used in the diagnostic.
 * @returns {string} the accepted text.
 * @throws {import('./errors.js').HttpError} 400 when the field is unusable.
 */
function requireText(value, max, field) {
	if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
	const text = value.trim();
	if (text === '') throw badRequest(`${field} must not be empty`);
	if (text.length > max) throw badRequest(`${field} must be at most ${max} characters`);
	// Control characters would corrupt a menu label or a log line.
	if (/[\u0000-\u001f\u007f]/.test(text)) throw badRequest(`${field} must not contain control characters`);
	return text;
}

/**
 * One optional, trimmed, length-bounded, control-free text field: absent and
 * empty are the same answer.
 * @param {unknown} value - claimed field value.
 * @param {number} max - accepted length.
 * @param {string} field - field name used in the diagnostic.
 * @returns {string} the accepted text, possibly empty.
 * @throws {import('./errors.js').HttpError} 400 when the field is unusable.
 */
function optionalText(value, max, field) {
	if (value === undefined || value === null) return '';
	if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
	const text = value.trim();
	if (text.length > max) throw badRequest(`${field} must be at most ${max} characters`);
	if (/[\u0000-\u001f\u007f]/.test(text)) throw badRequest(`${field} must not contain control characters`);
	return text;
}

/**
 * One icon id from the wire, defaulting to {@link DEFAULT_ICON}.
 * @param {unknown} value - claimed icon id; absent is the default.
 * @returns {string} the accepted icon id.
 * @throws {import('./errors.js').HttpError} 400 when the id is unknown.
 */
function requireIcon(value) {
	if (value === undefined || value === null || value === '') return DEFAULT_ICON;
	if (typeof value !== 'string' || !ICON_IDS.includes(value)) {
		throw badRequest(`unknown icon: ${String(value)}`);
	}
	return value;
}

/**
 * One stored icon id, coerced to the default when it is unusable. Stored state
 * is repaired rather than refused: a hand-edited file should degrade, not fail.
 * @param {unknown} value - stored icon id.
 * @returns {string} the accepted icon id.
 */
function acceptedIcon(value) {
	return typeof value === 'string' && ICON_IDS.includes(value) ? value : DEFAULT_ICON;
}

/**
 * A readable, collision-free id for a new user-defined command.
 * @param {readonly object[]} custom - existing user-defined commands.
 * @param {string} label - accepted label.
 * @returns {string} the id.
 */
function uniqueCustomId(custom, label) {
	const base = `custom:${slugify(label)}`;
	if (!custom.some((entry) => entry.id === base)) return base;
	for (let suffix = 2; suffix < 100; suffix += 1) {
		const candidate = `${base}-${suffix}`;
		if (!custom.some((entry) => entry.id === candidate)) return candidate;
	}
	return `${base}-${Date.now()}`;
}
