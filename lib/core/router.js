/**
 * The HTTP surface: one prefix route, five operations.
 *
 * Every request asks the composition's `connection` service for a rejection
 * first, so the harness's Host/Origin fence and its browser authentication gate
 * a caller before any project, command, log tail, or spawn is reachable. Behind
 * that fence each operation re-resolves the project on the host and addresses
 * commands by id — a program name is never accepted from the wire.
 *
 * @module dsh-run-environment/core/router
 */

import {
	badRequest,
	HttpError,
	notFound,
	payloadTooLarge,
	unsupportedMediaType,
} from './errors.js';
import { applyAction, buildCommands, commandPayload } from './model.js';
import { openWorkspace } from './workspace.js';

/** Prefix every operation lives under. */
export const ROUTE_PREFIX = '/run-environment';
/** Request bodies here are short strings; anything larger is hostile. */
const MAX_BODY_BYTES = 16 * 1024;
/** Default `GET /log` tail length. */
const DEFAULT_LOG_BYTES = 8000;

/**
 * Build the route the web server registers.
 *
 * @param {object} dependencies - the assembled plugin.
 * @param {object} dependencies.connection - harness connection service (trust fence).
 * @param {import('./registry.js').AdapterRegistry} dependencies.registry - environment adapters.
 * @param {import('./project-store.js').ProjectStore} dependencies.store - stored preferences.
 * @param {import('./runner.js').RunRegistry} dependencies.runs - process registry.
 * @param {'auto' | 'always' | 'never'} dependencies.visibility - when the control renders.
 * @param {object} dependencies.limits - limits echoed to the browser.
 * @returns {{kind: 'prefix', path: string, handler: (req: object, res: object) => Promise<void>}} the route.
 */
export function createRouter({ connection, registry, store, runs, visibility, limits }) {
	/**
	 * The built model of one claimed project.
	 * @param {unknown} cwd - claimed absolute project directory.
	 * @returns {Promise<{workspace: object, detected: object[], commands: object[], defaultId: string | null, state: object}>} the model.
	 * @throws {import('./errors.js').HttpError} 404 when the claim is not a project directory.
	 */
	const modelOf = async (cwd) => {
		const workspace = await openWorkspace(cwd);
		if (workspace === null) throw notFound(`not a project directory: ${String(cwd)}`);
		const detected = await registry.detect(workspace);
		const state = await store.read(workspace.directory);
		return { workspace, detected, state, ...buildCommands({ detected, state }) };
	};

	/**
	 * The one command a run or stop request names.
	 * @param {unknown} cwd - claimed project directory.
	 * @param {unknown} id - claimed command id.
	 * @returns {Promise<{workspace: object, command: object}>} the resolved target.
	 * @throws {import('./errors.js').HttpError} 404/400 when the target is unknown.
	 */
	const targetOf = async (cwd, id) => {
		const { workspace, commands } = await modelOf(cwd);
		const command = commands.find((entry) => entry.id === id);
		if (command === undefined) throw notFound(`unknown command: ${String(id)}`);
		if (command.hidden) throw badRequest(`command is hidden: ${command.id}`);
		return { workspace, command };
	};

	/**
	 * Answer one request body as a JSON object with the named string fields.
	 * @param {object} req - incoming request.
	 * @param {readonly string[]} fields - required string fields.
	 * @returns {Promise<Record<string, string>>} the parsed fields.
	 * @throws {import('./errors.js').HttpError} on media type, size, or shape failures.
	 */
	const readBody = async (req, fields) => {
		if (String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
			throw unsupportedMediaType('content-type must be application/json');
		}
		const chunks = [];
		let size = 0;
		for await (const chunk of req) {
			size += chunk.byteLength;
			if (size > MAX_BODY_BYTES) {
				req.resume();
				throw payloadTooLarge('request body is too large');
			}
			chunks.push(chunk);
		}
		let parsed;
		try {
			parsed = JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
		} catch {
			throw badRequest('request body must be JSON');
		}
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw badRequest('request body must be a JSON object');
		}
		const body = {};
		for (const field of fields) {
			if (typeof parsed[field] !== 'string') throw badRequest(`"${field}" must be a string`);
			body[field] = parsed[field];
		}
		for (const [field, value] of Object.entries(parsed)) {
			if (!(field in body)) body[field] = value;
		}
		return body;
	};

	/** @type {Map<string, {method: string, handle: (input: object) => Promise<object>}>} */
	const operations = new Map([
		[
			'/commands',
			{
				method: 'GET',
				handle: async ({ query }) => {
					const cwd = query.get('cwd') ?? '';
					const workspace = await openWorkspace(cwd);
					if (workspace === null) {
						return { present: false, cwd, adapters: registry.ids(), commands: [], defaultId: null, runs: [] };
					}
					const detected = await registry.detect(workspace);
					const state = await store.read(workspace.directory);
					const { commands, defaultId } = buildCommands({ detected, state });
					return {
						present: visibility === 'never' ? false : visibility === 'always' || commands.length > 0,
						cwd: workspace.directory,
						adapters: registry.ids(),
						commands: commands.map(commandPayload),
						defaultId,
						runs: runs.list(workspace.directory),
						limits,
					};
				},
			},
		],
		[
			'/run',
			{
				method: 'POST',
				handle: async ({ req }) => {
					const body = await readBody(req, ['cwd', 'id']);
					const { workspace, command } = await targetOf(body.cwd, body.id);
					const run = await runs.start({ directory: workspace.directory, command });
					// Choosing a command is also choosing the default, which is what
					// makes the play button follow the last thing the user picked.
					await store.mutate(workspace.directory, (state) => ({ ...state, defaultId: command.id }));
					return { run: runs.payload(run) };
				},
			},
		],
		[
			'/stop',
			{
				method: 'POST',
				handle: async ({ req }) => {
					const body = await readBody(req, ['cwd', 'id']);
					const { workspace } = await targetOf(body.cwd, body.id);
					const run = await runs.stop(workspace.directory, body.id);
					return { run: run === null ? null : runs.payload(run) };
				},
			},
		],
		[
			'/state',
			{
				method: 'POST',
				handle: async ({ req }) => {
					const body = await readBody(req, ['cwd', 'action']);
					const { workspace, detected, commands } = await modelOf(body.cwd);
					const state = await store.mutate(workspace.directory, (current) =>
						applyAction(current, body, commands),
					);
					const rebuilt = buildCommands({ detected, state });
					return {
						state,
						commands: rebuilt.commands.map(commandPayload),
						defaultId: rebuilt.defaultId,
					};
				},
			},
		],
		[
			'/log',
			{
				method: 'GET',
				handle: async ({ query }) => {
					const { workspace } = await targetOf(query.get('cwd') ?? '', query.get('id') ?? '');
					const id = query.get('id') ?? '';
					const run = runs.find(workspace.directory, id);
					if (run === undefined) throw notFound(`no run for ${id}`);
					const requested = Number.parseInt(query.get('bytes') ?? '', 10);
					const bytes = Number.isSafeInteger(requested) && requested > 0 ? requested : DEFAULT_LOG_BYTES;
					return { text: runs.tail(run, bytes), run: runs.payload(run) };
				},
			},
		],
	]);

	return {
		kind: 'prefix',
		path: ROUTE_PREFIX,
		/**
		 * Dispatch one request under the prefix.
		 * @param {object} req - incoming request.
		 * @param {object} res - server response.
		 * @returns {Promise<void>} after the response is written.
		 */
		handler: async (req, res) => {
			const rejection = connection.requestRejection(req);
			if (rejection !== undefined) {
				res.statusCode = rejection;
				res.end();
				return;
			}
			const url = new URL(String(req.url ?? '/'), 'http://localhost');
			const operation = operations.get(url.pathname.slice(ROUTE_PREFIX.length));
			if (operation === undefined) {
				sendJson(res, 404, { code: 'not-found', message: `unknown route: ${url.pathname}` });
				return;
			}
			if (req.method !== operation.method) {
				res.statusCode = 405;
				res.setHeader('allow', operation.method);
				res.end();
				return;
			}
			try {
				const payload = await operation.handle({ req, query: url.searchParams });
				if (typeof payload?.text === 'string') sendText(res, 200, payload.text);
				else sendJson(res, 200, { ok: true, ...payload });
			} catch (error) {
				if (error instanceof HttpError) {
					sendJson(res, error.status, { code: error.code, message: error.message });
					return;
				}
				sendJson(res, 500, {
					code: 'internal-error',
					message: error instanceof Error ? error.message : String(error),
				});
			}
		},
	};
}

/**
 * Write one JSON response. Responses are never cached: command lists and run
 * states are live facts.
 * @param {object} res - server response.
 * @param {number} status - status code.
 * @param {object} payload - JSON-serializable body.
 */
function sendJson(res, status, payload) {
	res.statusCode = status;
	res.setHeader('content-type', 'application/json; charset=utf-8');
	res.setHeader('cache-control', 'no-store');
	res.end(JSON.stringify(payload));
}

/**
 * Write one plain-text response.
 * @param {object} res - server response.
 * @param {number} status - status code.
 * @param {string} text - body.
 */
function sendText(res, status, text) {
	res.statusCode = status;
	res.setHeader('content-type', 'text/plain; charset=utf-8');
	res.setHeader('cache-control', 'no-store');
	res.end(text);
}
