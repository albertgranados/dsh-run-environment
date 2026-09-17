/**
 * Failures that carry the HTTP answer they must produce.
 *
 * The core layers throw these; only the router turns them into a status code
 * and a JSON body, so nothing below the transport has to know what a response
 * is.
 *
 * @module dsh-run-environment/core/errors
 */

/** One failure carrying the status and machine code its response must use. */
export class HttpError extends Error {
	/**
	 * @param {number} status - HTTP status code.
	 * @param {string} code - stable machine-readable code.
	 * @param {string} message - correction-oriented diagnostic without secrets.
	 */
	constructor(status, code, message) {
		super(message);
		this.name = 'HttpError';
		this.status = status;
		this.code = code;
	}
}

/**
 * Build one `HttpError` constructor.
 * @param {number} status - HTTP status code.
 * @param {string} code - stable machine-readable code.
 * @returns {(message: string) => HttpError} the constructor.
 */
function httpError(status, code) {
	return (message) => new HttpError(status, code, message);
}

/** 400 — the request is malformed or inconsistent with the project. */
export const badRequest = httpError(400, 'bad-request');
/** 404 — the project or command does not exist. */
export const notFound = httpError(404, 'not-found');
/** 415 — the request body is not JSON. */
export const unsupportedMediaType = httpError(415, 'unsupported-media-type');
/** 413 — the request body is over the accepted ceiling. */
export const payloadTooLarge = httpError(413, 'payload-too-large');
/** 429 — the host is already running as many commands as it allows. */
export const tooManyRuns = httpError(429, 'too-many-runs');
/** 502 — the command could not be launched at all. */
export const launchFailed = httpError(502, 'launch-failed');
