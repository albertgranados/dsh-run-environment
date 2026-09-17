/**
 * dsh-run-environment — host half.
 *
 * The plugin answers one question for the browser: *how is this workspace meant
 * to be run?* It composes four small pieces and owns none of their rules —
 * adapters detect (`core/registry.js`), preferences persist
 * (`core/project-store.js`), processes run (`core/runner.js`), and the HTTP
 * surface (`core/router.js`) joins them behind the harness's trust fence.
 *
 * `docs/architecture.md` explains the layering and why the browser half is a
 * thin view over this model.
 *
 * @module dsh-run-environment
 */

import { dshHomePath } from '@deepseek-ai/dsh-home-paths';
import z from '@deepseek-ai/schemastery';

import { builtinAdapters } from './adapters/index.js';
import { ProjectStore } from './core/project-store.js';
import { AdapterRegistry } from './core/registry.js';
import { createRouter, ROUTE_PREFIX } from './core/router.js';
import { RunRegistry } from './core/runner.js';

/** Cordis function-plugin name. */
export const name = 'dsh-run-environment';

/** Route carrier, request trust fence, and the executable/process seam. */
export const inject = ['webServer', 'connection', 'subprocess'];

/** Plugin configuration, validated by the harness before {@link apply} runs. */
export const Config = z.object({
	/**
	 * When the header control renders. `auto` shows it in a workspace where
	 * something was detected or something is configured, `always` shows it
	 * everywhere (the way to adopt a directory no adapter recognises yet), and
	 * `never` turns it off without uninstalling.
	 */
	visibility: z.union(['auto', 'always', 'never']).default('auto'),
	/** State-file path; empty means `$DSH_HOME/dsh-run-environment/projects.json`. */
	stateFile: z.string().default(''),
	/** Concurrent runs allowed across every project before the API refuses. */
	maxConcurrentRuns: z.natural().min(1).max(64).default(8),
	/** In-memory bytes retained per stream for the log tail. */
	collectBytes: z.natural().min(4096).max(1_048_576).default(32_768),
	/** Whole-stream spill cap per run; the full log survives past the tail window. */
	spillBytes: z.natural().min(65_536).max(268_435_456).default(4_194_304),
	/** SIGTERM→SIGKILL grace handed to the subprocess provider. */
	graceMs: z.natural().min(100).max(600_000).default(5000),
	/** A non-zero exit inside this window is reported as a failed launch. */
	failureWindowMs: z.natural().min(1000).max(600_000).default(30_000),
	/** Shell used for user-defined commands; empty means `$SHELL`, then `/bin/sh`. */
	shell: z.string().default(''),
});

/**
 * Compose the pieces and register the route.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context.
 * @param {z.infer<typeof Config>} config - validated configuration.
 * @returns {void}
 */
export function apply(ctx, config) {
	const registry = new AdapterRegistry({ logger: ctx.logger });
	for (const adapter of builtinAdapters) registry.register(adapter);

	const store = new ProjectStore({
		file: config.stateFile === '' ? dshHomePath('dsh-run-environment', 'projects.json') : config.stateFile,
		logger: ctx.logger,
	});

	const limits = {
		maxConcurrentRuns: config.maxConcurrentRuns,
		collectBytes: config.collectBytes,
		spillBytes: config.spillBytes,
		graceMs: config.graceMs,
		failureWindowMs: config.failureWindowMs,
	};

	const runs = new RunRegistry({
		subprocess: ctx.subprocess,
		limits,
		shell: config.shell === '' ? (process.env.SHELL ?? null) : config.shell,
		logger: ctx.logger,
	});

	ctx.effect(
		() =>
			ctx.webServer.register(
				createRouter({
					connection: ctx.connection,
					registry,
					store,
					runs,
					visibility: config.visibility,
					limits: { maxConcurrentRuns: limits.maxConcurrentRuns, stateFile: store.file },
				}),
			),
		`dsh-run-environment: ${ROUTE_PREFIX}`,
	);

	ctx.effect(
		() => () => {
			runs.dispose();
		},
		'dsh-run-environment: stop running commands on unload',
	);
}
