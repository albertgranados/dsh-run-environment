/**
 * dsh-run-environment — browser half.
 *
 * A thin view over the host model: one Session-header split button (play plus
 * chevron) whose play action runs the project's default command and whose menu
 * lists what the adapters detected, what the user defined, and the controls
 * that manage both. Every decision — which commands exist, which is the
 * default, what a hidden command means — is made on the host, so this file owns
 * rendering and nothing else.
 *
 * The bundle is authored directly in the loader's registration form: the
 * harness serves a plugin's client half verbatim, which keeps the package
 * dependency-free and installable straight from git. See `docs/architecture.md`.
 */
window.__ModuleLoader__.load({
	id: 'dsh-run-environment',
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

		const React = require('react');
		const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
		const Button = primitives.Button;
		const Input = primitives.Input;
		const Menu = primitives.Menu;
		const Modal = primitives.Modal;
		const Pill = primitives.Pill;
		const Tooltip = primitives.Tooltip;
		const IconAlarmClockOutline16 = primitives.IconAlarmClockOutline16;
		const IconApiOutline14 = primitives.IconApiOutline14;
		const IconBranchOutline16 = primitives.IconBranchOutline16;
		const IconChecklistOutline14 = primitives.IconChecklistOutline14;
		const IconCheckOutline16 = primitives.IconCheckOutline16;
		const IconChevronDownOutline14 = primitives.IconChevronDownOutline14;
		const IconCodeOutline16 = primitives.IconCodeOutline16;
		const IconCordisPluginOutline14 = primitives.IconCordisPluginOutline14;
		const IconDataOutline16 = primitives.IconDataOutline16;
		const IconDatabaseOutline16 = primitives.IconDatabaseOutline16;
		const IconEditOutline16 = primitives.IconEditOutline16;
		const IconEllipsisOutline16 = primitives.IconEllipsisOutline16;
		const IconFolderOpenOutline16 = primitives.IconFolderOpenOutline16;
		const IconGaugeOutline16 = primitives.IconGaugeOutline16;
		const IconGlobeOutline14 = primitives.IconGlobeOutline14;
		const IconLoadingOutline16 = primitives.IconLoadingOutline16;
		const IconPlayOutline16 = primitives.IconPlayOutline16;
		const IconPlusOutline16 = primitives.IconPlusOutline16;
		const IconRefreshOutline16 = primitives.IconRefreshOutline16;
		const IconSparkle16 = primitives.IconSparkle16;
		const IconStopFill16 = primitives.IconStopFill16;
		const IconTrashOutline16 = primitives.IconTrashOutline16;
		const IconWarningOutline16 = primitives.IconWarningOutline16;
		const h = React.createElement;

		//#region styles
		const css =
			'.RUNENV_split{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);height:28px;font-family:var(--dsw-font-family);border-radius:14px;align-items:stretch;display:inline-flex;overflow:hidden;flex:none}' +
			'.RUNENV_main,.RUNENV_chevron{color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;background:0 0;border:0;align-items:center;gap:5px;font-size:11px;font-weight:400;line-height:16px;display:inline-flex}' +
			'.RUNENV_main{padding:5px 6px 5px 7px;max-width:240px}' +
			'.RUNENV_main:hover:not(:disabled),.RUNENV_main:focus-visible,.RUNENV_chevron:hover,.RUNENV_chevron:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}' +
			'.RUNENV_main:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}' +
			'.RUNENV_main[data-state=error]{color:var(--dsw-alias-state-error-primary);box-shadow:inset 0 0 0 2px var(--dsw-alias-state-error-primary)}' +
			'.RUNENV_chevron{border-left:.5px solid var(--dsw-alias-border-l4);color:var(--dsw-alias-label-secondary);padding:5px 6px 5px 4px}' +
			'.RUNENV_icon{flex:none}' +
			'.RUNENV_label{overflow:hidden;text-overflow:ellipsis;font-family:var(--dsw-font-markdown-code-font-family,ui-monospace,SFMono-Regular,Menlo,monospace)}' +
			'.RUNENV_spin{animation:RUNENV_rotate 1s linear infinite}' +
			'@keyframes RUNENV_rotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}' +
			'.RUNENV_row{display:flex;align-items:center;gap:8px;min-width:0;width:100%}' +
			'.RUNENV_rowLabel{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
			// A marker, not a control: grey at rest, and inverted while the row itself
			// turns grey under the pointer so it never disappears into the hover.
			'.RUNENV_badge{flex:none;height:18px;padding:0 6px;border-radius:9px;font-size:10px;line-height:18px;background:var(--dsw-alias-interactive-bg-hover)}' +
			'[role="menuitem"]:hover .RUNENV_badge{background:var(--dsw-alias-bg-layer-2)}' +
			'.RUNENV_option{display:inline-flex;align-items:center;gap:8px}' +
			'.RUNENV_optionGlyph{flex:none;opacity:.8}' +
			'.RUNENV_more{flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;color:var(--dsw-alias-label-tertiary);background:0 0}' +
			'.RUNENV_more:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}' +
			'.RUNENV_anchor{position:fixed;left:0;top:0;width:0;height:0}' +
			'.RUNENV_form{display:flex;flex-direction:column;gap:14px;min-width:340px}' +
			'.RUNENV_field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--dsw-alias-label-secondary)}' +
			'.RUNENV_hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}' +
			'.RUNENV_error{font-size:11px;color:var(--dsw-alias-state-error-primary)}' +
			'.RUNENV_icons{display:flex;flex-wrap:wrap;gap:6px}' +
			'.RUNENV_iconOption{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;color:var(--dsw-alias-label-secondary);background:0 0;cursor:pointer}' +
			'.RUNENV_iconOption:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}' +
			// Selecting keeps the box the same size and doubles the ring with a shadow:
			// a hairline border renders as one translucent device pixel on a 1x
			// display, which reads as a rendering fault rather than a selection.
			'.RUNENV_iconOption[data-selected=true]{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary);box-shadow:0 0 0 1px var(--dsw-alias-label-primary)}' +
			'.RUNENV_iconOption:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}' +
			// Focus rings, in the same weight everywhere this control can take focus.
			'.RUNENV_main:focus-visible,.RUNENV_chevron:focus-visible{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 0 0 0 2px var(--dsw-alias-label-primary)}' +
			'.RUNENV_more:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:1px}' +
			// The harness draws a focused input as a 1px border, which reads as a
			// translucent hairline on a 1x display. The inset ring doubles it without
			// moving anything, and covers mouse and keyboard focus alike.
			'.RUNENV_form label > span:focus-within{box-shadow:inset 0 0 0 1px var(--dsw-alias-label-primary)}' +
			'.RUNENV_form input:focus{outline:none}' +
			'[role="menuitem"]:focus-visible .RUNENV_row,[role="menuitem"]:focus-visible .RUNENV_option{outline:2px solid var(--dsw-alias-label-primary);outline-offset:1px;border-radius:5px}';
		const styles = {
			split: 'RUNENV_split',
			main: 'RUNENV_main',
			chevron: 'RUNENV_chevron',
			icon: 'RUNENV_icon',
			label: 'RUNENV_label',
			spin: 'RUNENV_spin',
			row: 'RUNENV_row',
			rowLabel: 'RUNENV_rowLabel',
			badge: 'RUNENV_badge',
			option: 'RUNENV_option',
			optionGlyph: 'RUNENV_optionGlyph',
			more: 'RUNENV_more',
			anchor: 'RUNENV_anchor',
			form: 'RUNENV_form',
			field: 'RUNENV_field',
			hint: 'RUNENV_hint',
			error: 'RUNENV_error',
			icons: 'RUNENV_icons',
			iconOption: 'RUNENV_iconOption',
		};
		const styleTagId = 'dsh-run-environment/EnvironmentButton.module.css';
		if (
			typeof document !== 'undefined' &&
			document.querySelector('style[data-plugin-css=' + JSON.stringify(styleTagId) + ']') === null
		) {
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-run-environment';
			tag.dataset.pluginCss = styleTagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region icons
		/**
		 * The glyph every command wears until someone picks another: a six-spoke
		 * asterisk drawn here, so the default costs no icon set at all.
		 * @param {{size?: number}} props - rendered size in pixels.
		 * @returns {object} the element.
		 */
		function DefaultIcon({ size = 14 }) {
			return h(
				'svg',
				{
					width: size,
					height: size,
					viewBox: '0 0 16 16',
					fill: 'none',
					className: styles.icon,
					'aria-hidden': true,
				},
				h('path', {
					d: 'M8 2.2v11.6M3.3 4.9l9.4 6.2M12.7 4.9l-9.4 6.2',
					stroke: 'currentColor',
					strokeWidth: 1.3,
					strokeLinecap: 'round',
				}),
			);
		}

		/**
		 * The icon set, keyed by the ids the host validates against. An id with no
		 * component here falls back to the default glyph, so a newer host can never
		 * render a row with no icon at all.
		 */
		const ICONS = {
			play: IconPlayOutline16,
			sparkle: IconSparkle16,
			code: IconCodeOutline16,
			database: IconDatabaseOutline16,
			globe: IconGlobeOutline14,
			folder: IconFolderOpenOutline16,
			clock: IconAlarmClockOutline16,
			branch: IconBranchOutline16,
			api: IconApiOutline14,
			gauge: IconGaugeOutline16,
			plugin: IconCordisPluginOutline14,
			checklist: IconChecklistOutline14,
			refresh: IconRefreshOutline16,
			warning: IconWarningOutline16,
			data: IconDataOutline16,
		};

		/**
		 * One command icon.
		 * @param {{icon: string, size?: number}} props - icon id and rendered size.
		 * @returns {object} the element.
		 */
		function CommandIcon({ icon, size = 14 }) {
			const Component = ICONS[icon];
			if (Component === undefined) return h(DefaultIcon, { size });
			return h(Component, { size, className: styles.icon });
		}
		//#endregion

		//#region wire
		/** Host prefix every operation lives under. */
		const ROUTE_PREFIX = '/run-environment';
		/** Poll cadence while something is starting, running, or showing an error. */
		const POLL_MS = 2000;
		/** How long a failed launch keeps the error dress. */
		const ERROR_MS = 8000;
		/**
		 * A dialog ignores closes for this long after it opens. A double click — or
		 * the duplicate click some trackpads send — puts the second click on the
		 * mask of a dialog that has only just appeared, which would otherwise
		 * dismiss it in the same gesture that opened it.
		 */
		const DIALOG_GUARD_MS = 300;
		/** Menu ids owned by the control itself; command ids always contain a colon. */
		const UI = {
			add: 'ui:add',
			hide: 'ui:hide',
			show: 'ui:show',
			setDefault: 'ui:action:default',
			edit: 'ui:action:edit',
			delete: 'ui:action:delete',
			hidePrefix: 'ui:hide:',
			showPrefix: 'ui:show:',
		};

		/** Resolve the browser's Host base with the connection carrier's null-origin fallback. */
		function hostBase() {
			const origin = globalThis.location?.origin;
			return origin !== undefined && origin !== 'null' ? origin : 'http://dsh.internal';
		}

		/**
		 * One JSON call against the host.
		 * @param {string} path - path under the plugin prefix.
		 * @param {{method?: string, body?: object, query?: object, signal?: AbortSignal}} [options] - request options.
		 * @returns {Promise<object>} the parsed payload.
		 * @throws {Error} when the host refused the call.
		 */
		async function call(path, options = {}) {
			const url = new URL(`${hostBase()}${ROUTE_PREFIX}${path}`);
			for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, String(value));
			const response = await fetch(url, {
				method: options.method ?? 'GET',
				headers: options.body === undefined ? { accept: 'application/json' } : { 'content-type': 'application/json' },
				body: options.body === undefined ? undefined : JSON.stringify(options.body),
				signal: options.signal,
			});
			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				throw new Error(payload?.message ?? `HTTP ${String(response.status)}`);
			}
			return await response.json();
		}

		/**
		 * The label of one row-option item.
		 *
		 * The options are a second menu portaled to the document body, which makes
		 * them "outside" the command list as far as the list's own dismissal is
		 * concerned: its `pointerdown` listener lives on `document` and fires
		 * before the `click` that would pick an option. Stopping the pointer event
		 * here keeps the list open — and, more importantly, keeps it from tearing
		 * the options down mid-gesture, which is what made "Edit" do nothing at
		 * all with a real mouse.
		 *
		 * @param {string} text - the item's copy.
		 * @returns {object} the label node.
		 */
		function optionLabel(text, Component) {
			return h(
				'span',
				{
					className: styles.option,
					onPointerDown: (event) => {
						event.stopPropagation();
					},
					onMouseDown: (event) => {
						event.stopPropagation();
					},
				},
				Component === undefined ? null : h(Component, { size: 14, className: styles.optionGlyph }),
				text,
			);
		}

		/** Last non-empty line of a diagnostic tail, for a one-line tooltip. */
		function lastLine(text) {
			if (typeof text !== 'string') return '';
			const lines = text.split('\n').filter((line) => line.trim() !== '');
			return lines.length === 0 ? '' : lines[lines.length - 1].trim();
		}
		//#endregion

		//#region dialogs
		/**
		 * A close callback a dialog can trust: it ignores the tail of the gesture
		 * that opened it, then behaves normally.
		 * @param {boolean} open - whether the dialog is open.
		 * @param {() => void} onClose - the real close callback.
		 * @returns {() => void} the guarded callback.
		 */
		function useGuardedClose(open, onClose) {
			const openedAt = React.useRef(0);
			React.useEffect(() => {
				if (open) openedAt.current = Date.now();
			}, [open]);
			return () => {
				if (Date.now() - openedAt.current < DIALOG_GUARD_MS) return;
				onClose();
			};
		}

		/**
		 * One labelled text field.
		 * @param {{title: string, value: string, placeholder: string, onChange: (value: string) => void}} props - field state.
		 * @returns {object} the element.
		 */
		function Field({ title, value, placeholder, onChange }) {
			return h(
				'label',
				{ className: styles.field },
				title,
				h(Input, {
					value,
					placeholder,
					'aria-label': title,
					onChange: (event) => {
						onChange(event.target.value);
					},
				}),
			);
		}

		/**
		 * The icon picker: one button per id the host offers, the default glyph first.
		 * @param {{title: string, ids: readonly string[], value: string, onChange: (icon: string) => void}} props - picker state.
		 * @returns {object} the element.
		 */
		function IconPicker({ title, ids, value, onChange }) {
			return h(
				'div',
				{ className: styles.field },
				title,
				h(
					'div',
					{ className: styles.icons, role: 'radiogroup', 'aria-label': title },
					ids.map((icon) =>
						h(
							'button',
							{
								key: icon,
								type: 'button',
								role: 'radio',
								'aria-checked': icon === value,
								'aria-label': icon,
								title: icon,
								className: styles.iconOption,
								'data-selected': icon === value,
								onClick: () => {
									onChange(icon);
								},
							},
							h(CommandIcon, { icon, size: 15 }),
						),
					),
				),
			);
		}

		/**
		 * The "add a command" dialog: a name, the command line, and an icon.
		 * @param {object} props - dialog state and callbacks.
		 * @returns {object} the modal element.
		 */
		function AddCommandDialog({ open, draft, icons, pending, error, t, onChange, onClose, onSubmit }) {
			const close = useGuardedClose(open, onClose);
			const label = draft?.label ?? '';
			const command = draft?.command ?? '';
			const icon = draft?.icon ?? 'default';
			const valid = label.trim() !== '' && command.trim() !== '';
			return h(
				Modal,
				{
					open,
					onClose: close,
					title: t('dialog.title'),
					description: t('dialog.description'),
					closeLabel: t('dialog.cancel'),
					footer: [
						h(Button, { key: 'cancel', onClick: onClose }, t('dialog.cancel')),
						h(Button, { key: 'save', variant: 'primary', disabled: !valid || pending, onClick: onSubmit }, t('dialog.save')),
					],
				},
				h(
					'div',
					{ className: styles.form },
					h(Field, {
						title: t('dialog.label'),
						value: label,
						placeholder: t('dialog.labelPlaceholder'),
						onChange: (value) => {
							onChange({ ...draft, label: value });
						},
					}),
					h(Field, {
						title: t('dialog.command'),
						value: command,
						placeholder: t('dialog.commandPlaceholder'),
						onChange: (value) => {
							onChange({ ...draft, command: value });
						},
					}),
					h(IconPicker, {
						title: t('dialog.icon'),
						ids: icons,
						value: icon,
						onChange: (value) => {
							onChange({ ...draft, icon: value });
						},
					}),
					h('span', { className: styles.hint }, t('dialog.hint')),
					error === null ? null : h('span', { className: styles.error }, error),
				),
			);
		}

		/**
		 * The "edit a command" dialog: rename it and choose its icon. A detected
		 * command's command line belongs to its manifest and is shown read-only.
		 * @param {object} props - dialog state and callbacks.
		 * @returns {object | null} the modal element.
		 */
		function EditCommandDialog({ open, draft, icons, pending, error, t, onChange, onClose, onSubmit }) {
			// Hooks run before the early return, so opening and closing stay cheap.
			const close = useGuardedClose(open, onClose);
			if (draft === null) return null;
			const custom = draft.source === 'custom';
			const valid = draft.label.trim() !== '' && (!custom || draft.command.trim() !== '');
			return h(
				Modal,
				{
					open,
					onClose: close,
					title: t('edit.title', { command: draft.baseCommand }),
					description: t('edit.description'),
					closeLabel: t('edit.cancel'),
					footer: [
						h(Button, { key: 'cancel', onClick: onClose }, t('edit.cancel')),
						h(Button, { key: 'save', variant: 'primary', disabled: !valid || pending, onClick: onSubmit }, t('edit.save')),
					],
				},
				h(
					'div',
					{ className: styles.form },
					h(Field, {
						title: t('edit.name'),
						value: draft.label,
						placeholder: draft.baseCommand,
						onChange: (value) => {
							onChange({ ...draft, label: value });
						},
					}),
					h(IconPicker, {
						title: t('edit.icon'),
						ids: icons,
						value: draft.icon,
						onChange: (value) => {
							onChange({ ...draft, icon: value });
						},
					}),
					custom
						? h(Field, {
								title: t('edit.command'),
								value: draft.command,
								placeholder: t('dialog.commandPlaceholder'),
								onChange: (value) => {
									onChange({ ...draft, command: value });
								},
							})
						: h(
								'div',
								{ className: styles.field },
								t('edit.command'),
								h('span', { className: styles.hint }, t('edit.commandDetected')),
							),
					error === null ? null : h('span', { className: styles.error }, error),
				),
			);
		}
		//#endregion

		//#region component
		/**
		 * Session-header split button for one workspace's runnable commands.
		 * @param {object} props - session runtime (session id, Session store hook) and localized copy.
		 * @returns {object | null} the control, or null when the workspace shows nothing.
		 */
		function EnvironmentButton(props) {
			const { sessionId, useSessions, t } = props;
			const cwd = useSessions((state) => state.byId[sessionId]?.cwd);
			const [info, setInfo] = React.useState(null);
			const [open, setOpen] = React.useState(false);
			const [pending, setPending] = React.useState(false);
			const [failure, setFailure] = React.useState(null);
			const [revision, setRevision] = React.useState(0);
			const [addDraft, setAddDraft] = React.useState(null);
			const [editDraft, setEditDraft] = React.useState(null);
			const [dialogError, setDialogError] = React.useState(null);
			/** The row whose options are open, with the rect its popover anchors to. */
			const [actions, setActions] = React.useState(null);
			const failureTimer = React.useRef(undefined);
			React.useEffect(
				() => () => {
					clearTimeout(failureTimer.current);
				},
				[],
			);

			/** Show one failure for a bounded time. */
			const showFailure = React.useCallback((id, detail) => {
				setFailure({ id, detail: typeof detail === 'string' ? detail : '' });
				clearTimeout(failureTimer.current);
				failureTimer.current = setTimeout(() => {
					setFailure(null);
				}, ERROR_MS);
			}, []);

			const workspaceReady = typeof cwd === 'string' && cwd !== '';
			React.useEffect(() => {
				if (!workspaceReady) {
					setInfo(null);
					return undefined;
				}
				let cancelled = false;
				const controller = new AbortController();
				void (async () => {
					try {
						const payload = await call('/commands', { query: { cwd }, signal: controller.signal });
						if (!cancelled) setInfo(payload);
					} catch {
						// A refused read keeps the last known model: the control never blinks
						// out because one poll lost a race with the host.
					}
				})();
				return () => {
					cancelled = true;
					controller.abort();
				};
			}, [cwd, workspaceReady, revision]);

			const data = info !== null && info.cwd === cwd ? info : null;
			const commands = Array.isArray(data?.commands) ? data.commands : [];
			const icons = Array.isArray(data?.icons) && data.icons.length > 0 ? data.icons : ['default'];
			const detected = commands.filter((command) => command.source === 'detected' && !command.hidden);
			const custom = commands.filter((command) => command.source === 'custom');
			const hidden = commands.filter((command) => command.hidden);
			const visible = commands.filter((command) => !command.hidden);
			const current = visible.find((command) => command.id === data?.defaultId) ?? visible[0] ?? null;
			const runs = Array.isArray(data?.runs) ? data.runs : [];
			const active = runs.find((run) => run.id === current?.id && run.state === 'running') ?? null;
			const crashed = runs.find((run) => run.id === current?.id && run.failed === true) ?? null;
			const failureKey = crashed === null ? null : `${crashed.id}:${String(crashed.endedAt)}`;

			/**
			 * Detected commands grouped by the file that declared them, so the
			 * heading names the environment the commands come from. A host that
			 * cannot name the file still gets its adapter id rather than a generic
			 * word, because "where did this come from" is the whole point of the
			 * heading.
			 */
			const groups = [];
			for (const command of detected) {
				const title = command.manifest !== '' ? command.manifest : command.adapter;
				const group = groups.find((candidate) => candidate.title === title);
				if (group === undefined) groups.push({ title, commands: [command] });
				else group.commands.push(command);
			}

			/** Turn a host-reported early exit into the same bounded dress as a refused launch. */
			React.useEffect(() => {
				if (failureKey === null || crashed === null) return;
				showFailure(crashed.id, crashed.tail ?? '');
			}, [failureKey, crashed, showFailure]);

			const render = data !== null && data.present === true;
			const running = active !== null;
			const busy = pending || running || failure !== null;
			React.useEffect(() => {
				if (!render || !busy) return undefined;
				const timer = setInterval(() => {
					setRevision((value) => value + 1);
				}, POLL_MS);
				return () => {
					clearInterval(timer);
				};
			}, [busy, render]);

			/**
			 * One mutating call; failures land in the error dress rather than in the console.
			 * @param {() => Promise<object>} action - the call.
			 * @param {string} id - command the failure belongs to.
			 * @returns {Promise<void>} after the model is refreshed.
			 */
			const submit = React.useCallback(
				async (action, id) => {
					setPending(true);
					try {
						await action();
					} catch (error) {
						showFailure(id, error instanceof Error ? error.message : String(error));
					} finally {
						setPending(false);
						setRevision((value) => value + 1);
					}
				},
				[showFailure],
			);

			const runCommand = React.useCallback(
				(id, kind) => {
					if (!workspaceReady) return;
					void submit(
						() => call(kind === 'stop' ? '/stop' : '/run', { method: 'POST', body: { cwd, id } }),
						id,
					);
				},
				[cwd, workspaceReady, submit],
			);

			const mutate = React.useCallback(
				(action, id) => {
					if (!workspaceReady) return;
					void submit(() => call('/state', { method: 'POST', body: { cwd, ...action } }), id);
				},
				[cwd, workspaceReady, submit],
			);

			/**
			 * Run one dialog's submit, keeping its own error line inside the dialog.
			 * @param {() => Promise<object>} action - the call.
			 * @param {() => void} done - close callback.
			 * @returns {Promise<void>} after the model is refreshed.
			 */
			const submitDialog = React.useCallback(async (action, done) => {
				setPending(true);
				setDialogError(null);
				try {
					await action();
					done();
					setRevision((value) => value + 1);
				} catch (error) {
					setDialogError(error instanceof Error ? error.message : String(error));
				} finally {
					setPending(false);
				}
			}, []);

			if (!render) return null;

			const state = pending ? 'pending' : failure !== null ? 'error' : running ? 'running' : 'idle';
			const command = current?.command ?? '';
			const detail = current?.detail ?? '';
			const base =
				state === 'error'
					? t('action.failed', { command })
					: state === 'pending'
						? t('action.pending', { command })
						: running
							? t('action.stop', { command })
							: current === null
								? t('action.empty')
								: t('action.run', { command });
			const title = detail === '' ? base : `${base} — ${detail}`;
			const diagnostic = failure === null ? '' : lastLine(failure.detail);
			const fullTitle = state === 'error' && diagnostic !== '' ? `${title} — ${diagnostic}` : title;

			/**
			 * One command row: its icon on the left (the menu's own icon slot), its
			 * name, and the options handle on the right.
			 * @param {object} entry - the command.
			 * @returns {object} the item label node.
			 */
			const rowLabel = (entry) =>
				h(
					'span',
					{ className: styles.row },
					// The badge is fixed and the name is the flexible part, so a long
					// command truncates instead of squeezing the badge out.
					h('span', { className: styles.rowLabel }, entry.label),
					entry.id === data.defaultId ? h(Pill, { className: styles.badge }, t('row.default')) : null,
					h(
						'span',
						{
							role: 'button',
							tabIndex: -1,
							className: styles.more,
							'aria-label': t('row.options', { command: entry.label }),
							title: t('row.options', { command: entry.label }),
							onClick: (event) => {
								// The row itself would run the command; this handle only opens
								// its options, which stack next to it — the command list stays
								// open behind them.
								event.preventDefault();
								event.stopPropagation();
								setActions({ id: entry.id, rect: event.currentTarget.getBoundingClientRect() });
							},
						},
						h(IconEllipsisOutline16, { size: 14 }),
					),
				);

			const items = [];
			for (const group of groups) {
				items.push({ type: 'label', id: `ui:group:${group.title}`, text: group.title });
				for (const entry of group.commands) {
					items.push({ id: entry.id, label: rowLabel(entry), icon: h(CommandIcon, { icon: entry.icon }) });
				}
			}
			if (custom.length > 0) {
				items.push({ type: 'label', id: 'ui:group:custom', text: t('menu.custom') });
				for (const entry of custom) {
					items.push({ id: entry.id, label: rowLabel(entry), icon: h(CommandIcon, { icon: entry.icon }) });
				}
			}
			items.push({ type: 'separator', id: 'ui:separator:manage' });
			items.push({ type: 'label', id: 'ui:group:manage', text: t('menu.manage') });
			items.push({ id: UI.add, label: t('menu.add'), icon: h(IconPlusOutline16, { size: 14 }) });
			if (detected.length > 0) {
				items.push({
					id: UI.hide,
					label: t('menu.hide'),
					submenu: detected.map((entry) => ({ id: `${UI.hidePrefix}${entry.id}`, label: entry.label })),
				});
			}
			if (hidden.length > 0) {
				items.push({
					id: UI.show,
					label: t('menu.show', { count: String(hidden.length) }),
					submenu: hidden.map((entry) => ({ id: `${UI.showPrefix}${entry.id}`, label: entry.label })),
				});
			}

			/** Route one menu selection to a run, a state change, or a dialog. */
			const onSelect = (id) => {
				setOpen(false);
				if (pending) return;
				if (id === UI.add) {
					setDialogError(null);
					setAddDraft({ label: '', command: '', icon: 'default' });
					return;
				}
				if (id.startsWith(UI.hidePrefix)) {
					mutate({ action: 'hide', id: id.slice(UI.hidePrefix.length) }, id);
					return;
				}
				if (id.startsWith(UI.showPrefix)) {
					mutate({ action: 'show', id: id.slice(UI.showPrefix.length) }, id);
					return;
				}
				runCommand(id, running && id === current?.id ? 'stop' : 'run');
			};

			const actionTarget = actions === null ? null : (commands.find((entry) => entry.id === actions.id) ?? null);
			const iconClass = state === 'pending' ? `${styles.icon} ${styles.spin}` : styles.icon;
			const Icon = state === 'pending' ? IconLoadingOutline16 : running ? IconStopFill16 : IconPlayOutline16;
			const main = h(
				'button',
				{
					type: 'button',
					className: styles.main,
					'data-state': state,
					disabled: pending || current === null,
					'aria-label': fullTitle,
					onClick: () => {
						if (current !== null) runCommand(current.id, running ? 'stop' : 'run');
					},
				},
				h(Icon, { size: 15, className: iconClass }),
				h('span', { className: styles.label }, current === null ? t('action.empty') : current.label),
			);
			const chevron = h(
				'button',
				{
					type: 'button',
					className: styles.chevron,
					'aria-expanded': open,
					'aria-haspopup': 'menu',
					title: t('menu.toggle'),
					'aria-label': t('menu.aria'),
					onClick: () => {
						setOpen((value) => !value);
						setRevision((value) => value + 1);
					},
				},
				h(IconChevronDownOutline14, { size: 11 }),
			);

			const menu = h(Menu, {
				open,
				align: 'end',
				dense: true,
				// No item is marked selected: the default row already says so with its
				// pill, and a filled row reads like a hover that never goes away.
				onClose: () => {
					// Only the list closes here. The row options dismiss themselves on
					// Escape and on a pointerdown outside them, so tying them to the
					// list would only mean a pointerdown *inside* them tearing them
					// down before the click that picks an option lands.
					setOpen(false);
				},
				items,
				footer: [
					{
						type: 'label',
						id: 'ui:version',
						text: `${t('menu.version')} ${data.version ?? ''}`.trim(),
					},
				],
				onSelect,
				anchor: h(
					'div',
					{ className: styles.split },
					h(Tooltip, { label: fullTitle, side: 'bottom' }, main),
					chevron,
				),
			});

			const options =
				actionTarget === null
					? null
					: h(Menu, {
							open: true,
							portal: true,
							align: 'end',
							dense: true,
							className: styles.anchor,
							getAnchorRect: () => actions.rect,
							anchor: h('span', null),
							onClose: () => {
								setActions(null);
							},
							items: [
								{
									id: UI.setDefault,
									label: optionLabel(t('actions.setDefault'), IconCheckOutline16),
									disabled: actionTarget.id === data.defaultId,
								},
								{
									id: UI.edit,
									label: optionLabel(t('actions.edit'), IconEditOutline16),
								},
								// Only a command this plugin owns can be deleted; a detected
								// one belongs to its manifest and is hidden instead.
								...(actionTarget.source === 'custom'
									? [
											{
												id: UI.delete,
												label: optionLabel(t('actions.delete'), IconTrashOutline16),
												danger: true,
											},
										]
									: []),
							],
							onSelect: (id) => {
								const target = actionTarget;
								setActions(null);
								if (id === UI.setDefault) {
									mutate({ action: 'set-default', id: target.id }, target.id);
									return;
								}
								if (id === UI.delete) {
									mutate({ action: 'remove-custom', id: target.id }, target.id);
									return;
								}
								// A dialog takes the screen: the list it was called from steps
								// aside, the same way every other dialog in the harness behaves.
								setOpen(false);
								setDialogError(null);
								setEditDraft({
									id: target.id,
									source: target.source,
									label: target.label,
									baseCommand: target.command,
									command: target.command,
									icon: target.icon,
								});
							},
						});

			const addDialog = h(AddCommandDialog, {
				open: addDraft !== null,
				draft: addDraft,
				icons,
				pending,
				error: dialogError,
				t,
				onChange: setAddDraft,
				onClose: () => {
					setAddDraft(null);
					setDialogError(null);
				},
				onSubmit: () => {
					const next = addDraft ?? { label: '', command: '', icon: 'default' };
					if (next.label.trim() === '' || next.command.trim() === '') return;
					void submitDialog(
						() =>
							call('/state', {
								method: 'POST',
								body: { cwd, action: 'add-custom', label: next.label, command: next.command, icon: next.icon },
							}),
						() => {
							setAddDraft(null);
						},
					);
				},
			});

			const editDialog = h(EditCommandDialog, {
				open: editDraft !== null,
				draft: editDraft,
				icons,
				pending,
				error: dialogError,
				t,
				onChange: setEditDraft,
				onClose: () => {
					setEditDraft(null);
					setDialogError(null);
				},
				onSubmit: () => {
					const next = editDraft;
					if (next === null || next.label.trim() === '') return;
					const body = { cwd, action: 'edit', id: next.id, label: next.label, icon: next.icon };
					if (next.source === 'custom') body.command = next.command;
					void submitDialog(() => call('/state', { method: 'POST', body }), () => {
						setEditDraft(null);
					});
				},
			});

			return h(React.Fragment, null, menu, options, addDialog, editDialog);
		}
		//#endregion

		//#region locales
		/** Dictionary namespace owned by this plugin. */
		const NS = 'run-environment';
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			'action.run': '运行 {command}',
			'action.stop': '停止 {command}',
			'action.pending': '正在启动 {command}',
			'action.failed': '运行失败：{command}',
			'action.empty': '没有可用命令',
			'menu.version': 'dsh-run-environment',
			'menu.toggle': '选择要运行的命令',
			'menu.aria': '项目命令',
			'menu.custom': '自定义',
			'menu.manage': '管理',
			'menu.add': '添加命令…',
			'menu.hide': '隐藏命令',
			'menu.show': '显示隐藏的命令（{count}）',
			'row.default': '默认',
			'row.options': '“{command}”的选项',
			'actions.setDefault': '设为默认',
			'actions.edit': '编辑',
			'actions.delete': '删除',
			'dialog.title': '添加命令',
			'dialog.description': '为这个项目定义一个命令。它会在这个项目的工作目录中运行。',
			'dialog.label': '名称',
			'dialog.labelPlaceholder': '启动数据库',
			'dialog.command': '命令',
			'dialog.commandPlaceholder': 'docker compose up -d',
			'dialog.icon': '图标',
			'dialog.hint': '命令通过你的登录 shell 执行。',
			'dialog.save': '添加',
			'dialog.cancel': '取消',
			'edit.title': '编辑 {command}',
			'edit.description': '重命名命令并选择图标。',
			'edit.name': '名称',
			'edit.icon': '图标',
			'edit.command': '命令',
			'edit.commandDetected': '命令由清单定义，不在此处修改。',
			'edit.save': '保存',
			'edit.cancel': '取消',
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			'action.run': 'Run {command}',
			'action.stop': 'Stop {command}',
			'action.pending': 'Starting {command}',
			'action.failed': 'Failed: {command}',
			'action.empty': 'No commands',
			'menu.version': 'dsh-run-environment',
			'menu.toggle': 'Choose a command to run',
			'menu.aria': 'Project commands',
			'menu.custom': 'Custom',
			'menu.manage': 'Manage',
			'menu.add': 'Add command…',
			'menu.hide': 'Hide a command',
			'menu.show': 'Show hidden ({count})',
			'row.default': 'default',
			'row.options': 'Options for {command}',
			'actions.setDefault': 'Set as default',
			'actions.edit': 'Edit',
			'actions.delete': 'Delete',
			'dialog.title': 'Add a command',
			'dialog.description': 'Define a command for this project. It runs in the project directory.',
			'dialog.label': 'Name',
			'dialog.labelPlaceholder': 'Start the database',
			'dialog.command': 'Command',
			'dialog.commandPlaceholder': 'docker compose up -d',
			'dialog.icon': 'Icon',
			'dialog.hint': 'The command runs through your login shell.',
			'dialog.save': 'Add',
			'dialog.cancel': 'Cancel',
			'edit.title': 'Edit {command}',
			'edit.description': 'Rename the command and choose its icon.',
			'edit.name': 'Name',
			'edit.icon': 'Icon',
			'edit.command': 'Command',
			'edit.commandDetected': 'The command line comes from the manifest; it is not editable here.',
			'edit.save': 'Save',
			'edit.cancel': 'Cancel',
		};
		/** Spanish dictionary, key-identical to the Chinese source of truth. */
		const es = {
			'action.run': 'Ejecutar {command}',
			'action.stop': 'Detener {command}',
			'action.pending': 'Iniciando {command}',
			'action.failed': 'Fallo: {command}',
			'action.empty': 'Sin comandos',
			'menu.version': 'dsh-run-environment',
			'menu.toggle': 'Elegir un comando',
			'menu.aria': 'Comandos del proyecto',
			'menu.custom': 'Personalizados',
			'menu.manage': 'Gestionar',
			'menu.add': 'Añadir comando…',
			'menu.hide': 'Ocultar un comando',
			'menu.show': 'Mostrar ocultos ({count})',
			'row.default': 'por defecto',
			'row.options': 'Opciones de {command}',
			'actions.setDefault': 'Usar por defecto',
			'actions.edit': 'Editar',
			'actions.delete': 'Borrar',
			'dialog.title': 'Añadir un comando',
			'dialog.description': 'Define un comando para este proyecto. Se ejecuta en su directorio.',
			'dialog.label': 'Nombre',
			'dialog.labelPlaceholder': 'Arrancar la base de datos',
			'dialog.command': 'Comando',
			'dialog.commandPlaceholder': 'docker compose up -d',
			'dialog.icon': 'Icono',
			'dialog.hint': 'El comando se ejecuta con tu shell de inicio de sesión.',
			'dialog.save': 'Añadir',
			'dialog.cancel': 'Cancelar',
			'edit.title': 'Editar {command}',
			'edit.description': 'Renombra el comando y elige su icono.',
			'edit.name': 'Nombre',
			'edit.icon': 'Icono',
			'edit.command': 'Comando',
			'edit.commandDetected': 'La línea de comando viene del manifiesto; no se edita aquí.',
			'edit.save': 'Guardar',
			'edit.cancel': 'Cancelar',
		};
		//#endregion

		//#region plugin
		/** Required services: the Session store, the slot registry, and the dictionary registry. */
		const inject = ['sessions', 'slots', 'locale'];
		/**
		 * Client plugin body: register the dictionaries and the header control.
		 * @param {object} ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(
				() =>
					ctx.locale.register(NS, {
						zh,
						en,
						es,
					}),
				'dsh-run-environment: dictionaries',
			);
			ctx.slots.inject('conversation.session.header.utilities', () =>
				ctx.slots.register(
					{
						name: 'conversation.session.header.utilities',
						id: 'run-environment',
						order: -20,
						locale: NS,
						inject: () => ({}),
					},
					EnvironmentButton,
				),
			);
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		// Published for the contract test that keeps this picker's glyphs in step
		// with the ids the host validates against (see test/client-contract.test.js).
		exports.__icons = ['default', ...Object.keys(ICONS)];
		return module.exports;
	},
});
