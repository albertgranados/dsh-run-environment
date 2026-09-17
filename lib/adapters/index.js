/**
 * The adapters this package ships, in display order.
 *
 * Adding an environment means writing one module and adding it here; nothing
 * else in the plugin changes. `docs/adapters.md` covers the contract and the
 * roadmap lists what is planned.
 *
 * @module dsh-run-environment/adapters
 */

import { nodeNpmAdapter } from './node-npm.js';

/**
 * Every built-in adapter.
 *
 * @type {readonly import('../core/registry.js').Adapter[]}
 */
export const builtinAdapters = [nodeNpmAdapter];
