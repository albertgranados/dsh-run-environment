/**
 * The run registry: starting, observing, and stopping one command per project.
 *
 * Processes go through the harness `subprocess` service, so termination reaches
 * the whole process group (`npm → sh → the dev server`), collected output stays
 * readable after exit, and unloading the plugin stops what it started. This
 * module owns the bookkeeping — states, limits, reuse, failure classification —
 * and nothing else.
 *
 * @module dsh-run-environment/core/runner
 */

import { launchFailed, tooManyRuns } from './errors.js';

/** Run states the browser understands. */
const RUNNING = 'running';
const EXITED = 'exited';

/** Start, observe, and stop the commands of every project. */
export class RunRegistry {
	/** @type {Map<string, object>} */
	runs = new Map();
	/** @type {Map<string, string>} */
	executables = new Map();

	/**
	 * @param {object} options - dependencies and limits.
	 * @param {object} options.subprocess - the harness subprocess service.
	 * @param {object} options.limits - `maxConcurrentRuns`, `collectBytes`,
	 * `spillBytes`, `graceMs`, `failureWindowMs`.
	 * @param {string | null} [options.shell] - shell used for user-defined commands.
	 * @param {string} [options.platform] - platform override, for tests.
	 * @param {{warn?: (message: string) => void} | null} [options.logger] - diagnostic sink.
	 */
	constructor({ subprocess, limits, shell = null, platform = process.platform, logger = null }) {
		this.subprocess = subprocess;
		this.limits = limits;
		this.shell = shell;
		this.platform = platform;
		this.logger = logger;
	}

	/**
	 * Resolve one program through the subprocess seam's execution world, once.
	 * @param {string} program - bare PATH name or absolute path.
	 * @returns {Promise<string>} the resolved executable path.
	 * @throws {import('./errors.js').HttpError} 502 when the program is missing.
	 */
	async executableOf(program) {
		const cached = this.executables.get(program);
		if (cached !== undefined) return cached;
		let resolved;
		try {
			resolved = await this.subprocess.resolveExecutable(program);
		} catch (error) {
			throw launchFailed(`${program} was not found on PATH (${error instanceof Error ? error.message : String(error)})`);
		}
		this.executables.set(program, resolved);
		return resolved;
	}

	/** Runs currently alive across every project. */
	runningCount() {
		let count = 0;
		for (const run of this.runs.values()) if (run.state === RUNNING) count += 1;
		return count;
	}

	/**
	 * Start one command, reusing the live run of the same command so a double
	 * click cannot race two servers onto one port.
	 * @param {{directory: string, command: object}} input - project and command.
	 * @returns {Promise<object>} the run record.
	 * @throws {import('./errors.js').HttpError} 429 past the concurrency limit, 502 when it cannot start.
	 */
	async start({ directory, command }) {
		const key = keyOf(directory, command.id);
		const existing = this.runs.get(key);
		if (existing !== undefined && existing.state === RUNNING) return existing;
		if (this.runningCount() >= this.limits.maxConcurrentRuns) {
			throw tooManyRuns(`already running ${this.limits.maxConcurrentRuns} commands`);
		}
		const argv = command.argv === null ? this.shellArgv(command.command) : await this.requiredArgv(command.argv);
		const collect = { maxBytes: this.limits.collectBytes, spill: { maxBytes: this.limits.spillBytes } };
		const handle = this.subprocess.spawn({
			argv,
			cwd: directory,
			stdio: { stdin: 'ignore', stdout: collect, stderr: collect },
			graceMs: this.limits.graceMs,
			env: { FORCE_COLOR: '0', NO_COLOR: '1', npm_config_color: 'false' },
		});
		const run = {
			directory,
			id: command.id,
			command: command.command,
			label: command.label,
			handle,
			state: RUNNING,
			exitCode: null,
			signal: null,
			startedAt: Date.now(),
			endedAt: null,
			stopped: false,
			failed: false,
			error: null,
		};
		this.runs.set(key, run);
		handle.done.then(
			(outcome) => {
				this.settle(run, outcome);
			},
			(cause) => {
				this.settle(run, { exitCode: null, signal: null, error: cause instanceof Error ? cause.message : String(cause) });
			},
		);
		return run;
	}

	/**
	 * Stop one run and wait for its process range to drain.
	 * @param {string} directory - project directory.
	 * @param {string} id - command id.
	 * @returns {Promise<object | null>} the settled run, or null when none is known.
	 */
	async stop(directory, id) {
		const run = this.runs.get(keyOf(directory, id));
		if (run === undefined) return null;
		if (run.state === RUNNING) {
			run.stopped = true;
			run.handle.terminate();
			try {
				await run.handle.waitForExit(AbortSignal.timeout(this.limits.graceMs + 3000));
			} catch {
				// The escalation ladder is the provider's; a bounded wait is enough here.
			}
			this.settle(run, { exitCode: run.exitCode, signal: run.signal ?? 'SIGKILL' });
		}
		return run;
	}

	/**
	 * One run, when this host knows it.
	 * @param {string} directory - project directory.
	 * @param {string} id - command id.
	 * @returns {object | undefined} the run record.
	 */
	find(directory, id) {
		return this.runs.get(keyOf(directory, id));
	}

	/**
	 * Every run known for one project.
	 * @param {string} directory - project directory.
	 * @returns {object[]} the wire payloads, most recent first.
	 */
	list(directory) {
		return [...this.runs.values()]
			.filter((run) => run.directory === directory)
			.sort((left, right) => right.startedAt - left.startedAt)
			.map((run) => this.payload(run));
	}

	/**
	 * The wire shape of one run; a failed run carries the diagnostic tail.
	 * @param {object} run - run record.
	 * @returns {object} the payload.
	 */
	payload(run) {
		return {
			id: run.id,
			command: run.command,
			state: run.state,
			startedAt: run.startedAt,
			endedAt: run.endedAt,
			exitCode: run.exitCode,
			signal: run.signal,
			stopped: run.stopped,
			failed: run.failed,
			error: run.error,
			...(run.failed ? { tail: this.tail(run, 1200) } : {}),
		};
	}

	/**
	 * The retained tail of one run: stderr when it said anything, else stdout.
	 * @param {object} run - run record.
	 * @param {number} bytes - maximum length returned.
	 * @returns {string} the tail.
	 */
	tail(run, bytes) {
		const stderr = run.handle.collected.stderr?.readFrom(0)?.text ?? '';
		const stdout = run.handle.collected.stdout?.readFrom(0)?.text ?? '';
		const text = (stderr.trim() === '' ? stdout : stderr).replace(/\s+$/, '');
		return text.length > bytes ? text.slice(-bytes) : text;
	}

	/**
	 * Close one run's record exactly once, classifying an early non-zero exit as
	 * a failed launch rather than a finished command.
	 * @param {object} run - run record.
	 * @param {{exitCode?: number | null, signal?: string | null, error?: string | null}} outcome - exit facts.
	 */
	settle(run, outcome) {
		if (run.state !== RUNNING) return;
		run.state = EXITED;
		run.exitCode = outcome?.exitCode ?? null;
		run.signal = outcome?.signal ?? null;
		run.endedAt = Date.now();
		run.error = outcome?.error ?? null;
		run.failed =
			!run.stopped &&
			run.endedAt - run.startedAt <= this.limits.failureWindowMs &&
			(outcome?.error != null || (run.exitCode !== null && run.exitCode !== 0));
	}

	/**
	 * Resolve an adapter command's argv against the execution world.
	 * @param {readonly string[]} argv - adapter argv.
	 * @returns {Promise<string[]>} argv with a resolved program.
	 */
	async requiredArgv(argv) {
		const [program, ...args] = argv;
		if (program === undefined) throw launchFailed('command has no program');
		return [await this.executableOf(program), ...args];
	}

	/**
	 * Wrap a user-defined command string in the configured shell: the string is
	 * the user's own text, so it is interpreted exactly as a terminal would.
	 * @param {string} command - the command string.
	 * @returns {string[]} shell argv.
	 */
	shellArgv(command) {
		if (this.platform === 'win32') return [this.shell ?? 'cmd.exe', '/d', '/s', '/c', command];
		return [this.shell ?? '/bin/sh', '-c', command];
	}

	/** Terminate everything still alive; called when the plugin unloads. */
	dispose() {
		for (const run of this.runs.values()) {
			if (run.state !== RUNNING) continue;
			run.stopped = true;
			run.handle.terminate();
		}
	}
}

/**
 * The identity of one run: a command in one project.
 * @param {string} directory - project directory.
 * @param {string} id - command id.
 * @returns {string} the map key.
 */
function keyOf(directory, id) {
	return `${directory}\u0000${id}`;
}
