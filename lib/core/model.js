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
/** Maximum length of a user-defined label. */
export const MAX_LABEL_LENGTH = 60;

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
 * @returns {{defaultId: string | null, hidden: string[], custom: object[]}} the document.
 */
export function emptyState() {
	return { defaultId: null, hidden: [], custom: [] };
}

/**
 * Coerce untrusted stored JSON into a valid preference document. Unknown fields
 * are dropped, wrong types fall back to the empty document, and oversized
 * values are truncated, so a hand-edited or truncated state file can never take
 * the header down.
 * @param {unknown} raw - value read from the state file.
 * @returns {{defaultId: string | null, hidden: string[], custom: object[]}} a fresh document.
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
			const { id, label, command } = entry;
			if (typeof id !== 'string' || id === '' || seen.has(id)) continue;
			if (typeof label !== 'string' || typeof command !== 'string') continue;
			if (label.trim() === '' || command.trim() === '') continue;
			seen.add(id);
			state.custom.push({
				id,
				label: label.slice(0, MAX_LABEL_LENGTH),
				command: command.slice(0, MAX_COMMAND_LENGTH),
			});
			if (state.custom.length >= MAX_CUSTOM_COMMANDS) break;
		}
	}
	return state;
}

/**
 * Merge detections with stored preferences into the ordered runnable list.
 *
 * Ordering is by adapter priority and then by detection order, which is what
 * makes `dev` win over `start` over "whatever the manifest listed first"
 * without the model knowing anything about Node.js.
 *
 * @param {{detected: readonly object[], state: object}} input - detections and preferences.
 * @returns {{commands: object[], visible: object[], defaultId: string | null}} the model.
 */
export function buildCommands({ detected, state }) {
	const hidden = new Set(state.hidden);
	const commands = [
		...detected.map((command) => ({ ...command, source: 'detected', hidden: hidden.has(command.id) })),
		...state.custom.map((entry) => ({
			id: entry.id,
			label: entry.label,
			command: entry.command,
			// A user command IS its command text, so it carries no separate detail.
			detail: '',
			argv: null,
			priority: DEFAULT_PRIORITY,
			adapter: CUSTOM_ADAPTER,
			source: 'custom',
			hidden: false,
		})),
	];
	const visible = commands.filter((command) => !command.hidden);
	const declared = visible.find((command) => command.id === state.defaultId);
	const ranked = visible
		.map((command, index) => ({ command, index }))
		.sort((left, right) => left.command.priority - right.command.priority || left.index - right.index);
	return { commands, visible, defaultId: declared?.id ?? ranked[0]?.command.id ?? null };
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
			next.custom.push({ id: uniqueCustomId(next.custom, label), label, command });
			break;
		}
		case 'remove-custom': {
			const index = next.custom.findIndex((entry) => entry.id === action.id);
			if (index === -1) throw badRequest(`unknown user-defined command: ${String(action.id)}`);
			next.custom.splice(index, 1);
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
