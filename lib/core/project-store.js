/**
 * One JSON document holding every project's preferences.
 *
 * The document lives under the harness home rather than inside the project, so
 * nothing this plugin knows ever lands in someone's repository. Reads are
 * cached against the file's modification time; mutations re-read before
 * writing, so two harness instances on one machine cannot silently clobber each
 * other's last action.
 *
 * @module dsh-run-environment/core/project-store
 */

import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { normalizeState } from './model.js';

/** Shape version of the state document; a future migration keys off this. */
export const DOCUMENT_VERSION = 1;

/** The persisted preferences of every project on this machine. */
export class ProjectStore {
	/** @type {Map<string, {mtimeMs: number, document: object}>} */
	cache = new Map();
	/** Serializes mutations so two actions never interleave their writes. */
	queue = Promise.resolve();

	/**
	 * @param {{file: string, maxProjects?: number, logger?: {warn?: (message: string) => void} | null}} options
	 * - `file` is the absolute state-file path; `maxProjects` bounds how many
	 * projects are remembered before the least recently used are dropped.
	 */
	constructor({ file, maxProjects = 200, logger = null }) {
		this.file = file;
		this.maxProjects = maxProjects;
		this.logger = logger;
	}

	/**
	 * Read one project's preferences.
	 * @param {string} directory - absolute project directory.
	 * @returns {Promise<object>} a normalized preference document.
	 */
	async read(directory) {
		const document = await this.load();
		return normalizeState(document.projects[directory]);
	}

	/**
	 * Apply one pure transition to a project's preferences and persist it.
	 * @param {string} directory - absolute project directory.
	 * @param {(state: object) => object} mutate - pure transition.
	 * @returns {Promise<object>} the persisted (normalized) document.
	 */
	async mutate(directory, mutate) {
		const run = this.queue.then(async () => {
			const document = await this.load({ fresh: true });
			const next = normalizeState(mutate(normalizeState(document.projects[directory])));
			document.projects[directory] = { ...next, updatedAt: new Date().toISOString() };
			prune(document, this.maxProjects);
			await this.save(document);
			return normalizeState(document.projects[directory]);
		});
		this.queue = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}

	/**
	 * The state document, re-read from disk when it changed under us or when a
	 * caller needs the authoritative copy.
	 * @param {{fresh?: boolean}} [options] - `fresh` skips the cache.
	 * @returns {Promise<object>} the document.
	 */
	async load({ fresh = false } = {}) {
		let revision = null;
		try {
			revision = (await stat(this.file)).mtimeMs;
		} catch {
			revision = null;
		}
		if (!fresh) {
			const cached = this.cache.get(this.file);
			if (cached !== undefined && cached.mtimeMs === revision) return cached.document;
		}
		const document = await this.readDocument();
		this.cache.set(this.file, { mtimeMs: revision, document });
		return document;
	}

	/**
	 * Parse the state file, recovering from absence and from corruption.
	 * @returns {Promise<object>} a valid document.
	 */
	async readDocument() {
		let text;
		try {
			text = await readFile(this.file, 'utf8');
		} catch {
			return { version: DOCUMENT_VERSION, projects: {} };
		}
		try {
			const parsed = JSON.parse(text);
			if (typeof parsed !== 'object' || parsed === null || typeof parsed.projects !== 'object' || parsed.projects === null) {
				throw new Error('unexpected document shape');
			}
			return { version: DOCUMENT_VERSION, projects: parsed.projects };
		} catch (error) {
			await this.quarantine(error);
			return { version: DOCUMENT_VERSION, projects: {} };
		}
	}

	/**
	 * Move an unreadable state file aside instead of overwriting it, so a user
	 * who hand-edited the file can recover what they wrote.
	 * @param {unknown} error - the parse failure.
	 * @returns {Promise<void>} after the file is out of the way.
	 */
	async quarantine(error) {
		const target = `${this.file}.corrupt`;
		try {
			await rename(this.file, target);
			this.logger?.warn?.(
				`dsh-run-environment: unreadable state file moved to ${target} (${error instanceof Error ? error.message : String(error)})`,
			);
		} catch {
			// An absent file (or an unwritable directory) needs no recovery step.
		}
	}

	/**
	 * Write the document atomically: a temporary sibling is renamed over the
	 * target, so a crash mid-write can never truncate the state.
	 * @param {object} document - the document to persist.
	 * @returns {Promise<void>} after the rename.
	 */
	async save(document) {
		await mkdir(dirname(this.file), { recursive: true });
		const temporary = `${this.file}.${process.pid}.tmp`;
		await writeFile(temporary, `${JSON.stringify(document, null, '\t')}\n`, 'utf8');
		await rename(temporary, this.file);
		this.cache.delete(this.file);
	}
}

/**
 * Bound the document: the least recently touched projects are dropped once the
 * cap is reached, so a long-lived machine cannot grow it without limit.
 * @param {object} document - the document to trim in place.
 * @param {number} maxProjects - cap.
 */
function prune(document, maxProjects) {
	const entries = Object.entries(document.projects);
	if (entries.length <= maxProjects) return;
	entries
		.sort((left, right) => String(left[1]?.updatedAt ?? '').localeCompare(String(right[1]?.updatedAt ?? '')))
		.slice(0, entries.length - maxProjects)
		.forEach(([directory]) => {
			delete document.projects[directory];
		});
}
