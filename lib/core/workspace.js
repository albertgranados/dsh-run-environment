/**
 * Workspace access: one validated project directory, plus the confined file
 * reads adapters need.
 *
 * Reads are cached against the file's modification time, so the browser polling
 * the command list every couple of seconds costs a few `stat` calls rather than
 * a manifest parse, and an adapter that declares `watch` paths gets a cheap
 * change stamp for free.
 *
 * @module dsh-run-environment/core/workspace
 */

import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

/** One directory proved to exist, with every read confined to it. */
export class Workspace {
	/**
	 * @param {string} directory - absolute path of an existing directory.
	 */
	constructor(directory) {
		/** Absolute project root every read is resolved against. */
		this.directory = directory;
		/** @type {Map<string, {revision: number, text: string}>} */
		this.texts = new Map();
	}

	/**
	 * Resolve a workspace-relative path, refusing anything that leaves the root.
	 * @param {string} path - workspace-relative path.
	 * @returns {string} the absolute path.
	 * @throws {Error} when the path is absolute or escapes the project root.
	 */
	pathOf(path) {
		const absolute = resolve(this.directory, path);
		const inside = relative(this.directory, absolute);
		if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
			throw new Error(`workspace path escapes the project root: ${path}`);
		}
		return absolute;
	}

	/**
	 * Metadata of one workspace file.
	 * @param {string} path - workspace-relative path.
	 * @returns {Promise<{mtimeMs: number, size: number} | null>} null when absent or not a regular file.
	 */
	async statOf(path) {
		try {
			const info = await stat(this.pathOf(path));
			return info.isFile() ? { mtimeMs: info.mtimeMs, size: info.size } : null;
		} catch {
			return null;
		}
	}

	/**
	 * Read one workspace file as UTF-8 text.
	 * @param {string} path - workspace-relative path.
	 * @returns {Promise<string | null>} the text, or null when unreadable.
	 */
	async readText(path) {
		const meta = await this.statOf(path);
		if (meta === null) return null;
		const cached = this.texts.get(path);
		if (cached !== undefined && cached.revision === meta.mtimeMs) return cached.text;
		let text;
		try {
			text = await readFile(this.pathOf(path), 'utf8');
		} catch {
			return null;
		}
		this.texts.set(path, { revision: meta.mtimeMs, text });
		return text;
	}

	/**
	 * Read and parse one workspace JSON file.
	 * @param {string} path - workspace-relative path.
	 * @returns {Promise<unknown | null>} the parsed value, or null when unreadable or malformed.
	 */
	async readJson(path) {
		const text = await this.readText(path);
		if (text === null) return null;
		try {
			return JSON.parse(text);
		} catch {
			return null;
		}
	}

	/**
	 * One stamp covering the given workspace-relative paths. Equal stamps mean
	 * none of the declared inputs changed since the previous detection.
	 * @param {Iterable<string>} paths - workspace-relative paths to stamp.
	 * @returns {Promise<string>} the stamp.
	 */
	async fingerprint(paths) {
		const parts = [];
		for (const path of [...paths].sort()) {
			const meta = await this.statOf(path);
			parts.push(`${path}:${meta === null ? '-' : `${meta.mtimeMs}/${meta.size}`}`);
		}
		return parts.join('|');
	}
}

/**
 * Open a claimed project directory.
 * @param {unknown} directory - untrusted absolute path from the wire.
 * @returns {Promise<Workspace | null>} the workspace, or null when the claim is
 * not an absolute path naming an existing directory.
 */
export async function openWorkspace(directory) {
	if (typeof directory !== 'string' || directory === '' || !isAbsolute(directory)) return null;
	try {
		const info = await stat(directory);
		if (!info.isDirectory()) return null;
	} catch {
		return null;
	}
	return new Workspace(directory);
}
