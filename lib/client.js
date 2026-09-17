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
		const StateDot = primitives.StateDot;
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
			'.RUNENV_console{display:flex;flex-direction:column;height:100%;min-height:0}' +
			'.RUNENV_consoleBar{display:flex;align-items:center;gap:8px;padding:6px 10px;flex:none;border-bottom:1px solid var(--dsw-alias-border-l3)}' +
			'.RUNENV_consoleCommand{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--dsw-alias-label-secondary)}' +
			'.RUNENV_consoleSpacer{flex:1}' +
			'.RUNENV_consoleStatus{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary)}' +
			'.RUNENV_consoleOutput{flex:1;min-height:0;overflow:auto;margin:0;padding:8px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-secondary)}' +
			'.RUNENV_consoleEmpty{flex:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--dsw-alias-label-tertiary)}' +
			'.RUNENV_consoleFailure{padding:6px 10px;font-size:11px;color:var(--dsw-alias-state-error-primary)}' +
			'.RUNENV_buttonStatus{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;flex:none}' +
			'.RUNENV_label{overflow:hidden;text-overflow:ellipsis;font-family:var(--dsw-font-markdown-code-font-family,ui-monospace,SFMono-Regular,Menlo,monospace)}' +
			'.RUNENV_spin{animation:RUNENV_rotate 1s linear infinite}' +
			'@keyframes RUNENV_rotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}' +
			'.RUNENV_group{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%}' +
			'.RUNENV_groupTitle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
			'.RUNENV_reveal{flex:none;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;white-space:nowrap}' +
			'.RUNENV_reveal:hover,.RUNENV_reveal:focus-visible{color:var(--dsw-alias-label-primary)}' +
			'.RUNENV_reveal[data-on=true]{color:var(--dsw-alias-label-secondary)}' +
			'.RUNENV_status{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:5px;cursor:pointer}' +
			'.RUNENV_status:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
			'.RUNENV_dragging{opacity:.4}' +
			'.RUNENV_dropBefore{box-shadow:inset 0 2px 0 var(--dsw-alias-label-primary)}' +
			'.RUNENV_dropAfter{box-shadow:inset 0 -2px 0 var(--dsw-alias-label-primary)}' +
			'.RUNENV_dim{opacity:.45}' +
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
			buttonStatus: 'RUNENV_buttonStatus',
			console: 'RUNENV_console',
			consoleBar: 'RUNENV_consoleBar',
			consoleCommand: 'RUNENV_consoleCommand',
			consoleSpacer: 'RUNENV_consoleSpacer',
			consoleStatus: 'RUNENV_consoleStatus',
			consoleOutput: 'RUNENV_consoleOutput',
			consoleEmpty: 'RUNENV_consoleEmpty',
			consoleFailure: 'RUNENV_consoleFailure',
			group: 'RUNENV_group',
			groupTitle: 'RUNENV_groupTitle',
			reveal: 'RUNENV_reveal',
			status: 'RUNENV_status',
			dragging: 'RUNENV_dragging',
			dropBefore: 'RUNENV_dropBefore',
			dropAfter: 'RUNENV_dropAfter',
			dim: 'RUNENV_dim',
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
		 * An eye, open or struck through. The harness's icon set has no eye, and
		 * this one belongs to the control's own vocabulary rather than to the
		 * command icon picker.
		 * @param {{size?: number, off?: boolean}} props - rendered size and state.
		 * @returns {object} the element.
		 */
		function EyeIcon({ size = 14, off = false }) {
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
					d: 'M1.5 8s2.6-4.4 6.5-4.4S14.5 8 14.5 8s-2.6 4.4-6.5 4.4S1.5 8 1.5 8Z',
					stroke: 'currentColor',
					strokeWidth: 1.3,
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
				}),
				off
					? h('path', {
							d: 'M2.6 13.4 13.4 2.6',
							stroke: 'currentColor',
							strokeWidth: 1.3,
							strokeLinecap: 'round',
						})
					: h('circle', { cx: 8, cy: 8, r: 1.9, fill: 'currentColor' }),
			);
		}

		/** The eye open, as a row-option glyph. */
		function EyeOpenIcon(props) {
			return h(EyeIcon, { ...props, off: false });
		}

		/** The eye struck through, as a row-option glyph. */
		function EyeOffIcon(props) {
			return h(EyeIcon, { ...props, off: true });
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
			hide: 'ui:action:hide',
			show: 'ui:action:show',
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
				const error = new Error(payload?.message ?? `HTTP ${String(response.status)}`);
				// The status travels with the failure: a caller has to be able to tell
				// "the host answered no" from "the host did not answer".
				error.status = response.status;
				throw error;
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
		 * One labelled text field, optionally locked with a note underneath.
		 * @param {object} props - field state: title, value, placeholder, hint,
		 * disabled, and the change callback.
		 * @returns {object} the element.
		 */
		function Field({ title, value, placeholder, hint, disabled = false, onChange }) {
			return h(
				'label',
				{ className: styles.field },
				title,
				h(Input, {
					value,
					placeholder,
					'aria-label': title,
					disabled,
					onChange: (event) => {
						onChange(event.target.value);
					},
				}),
				hint === undefined ? null : h('span', { className: styles.hint }, hint),
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
			const description = draft?.description ?? '';
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
					h(Field, {
						title: t('field.description'),
						value: description,
						placeholder: t('field.descriptionPlaceholder'),
						hint: t('field.descriptionHint'),
						onChange: (value) => {
							onChange({ ...draft, description: value });
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
		 * The stop confirmation a running command's status dot opens.
		 * @param {object} props - dialog state and callbacks.
		 * @returns {object | null} the modal element.
		 */
		function StopCommandDialog({ open, draft, pending, t, onClose, onSubmit }) {
			const close = useGuardedClose(open, onClose);
			if (draft === null) return null;
			return h(
				Modal,
				{
					open,
					onClose: close,
					title: t('stop.title', { command: draft.label }),
					description: t('stop.description'),
					closeLabel: t('stop.cancel'),
					footer: [
						h(Button, { key: 'cancel', onClick: close }, t('stop.cancel')),
						h(Button, { key: 'stop', variant: 'primary', disabled: pending, onClick: onSubmit }, t('stop.confirm')),
					],
				},
				null,
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
			const valid = draft.label.trim() !== '';
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
					h(Field, {
						title: t('field.description'),
						value: draft.description,
						placeholder: t('field.descriptionPlaceholder'),
						hint: t('field.descriptionHint'),
						onChange: (value) => {
							onChange({ ...draft, description: value });
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
					// The command line is shown but never editable: a detected one
					// belongs to its manifest, and a user-defined one is what the
					// command is — renaming or redescribing it should not silently
					// change what runs.
					h(Field, {
						title: t('edit.command'),
						value: draft.baseCommand,
						disabled: true,
						hint: custom ? t('edit.commandLocked') : t('edit.commandDetected'),
						onChange: () => {},
					}),
					error === null ? null : h('span', { className: styles.error }, error),
				),
			);
		}
		//#endregion

		/** The right Sidebar tab kind this plugin owns. */
		const CONSOLE_KIND = 'run-console';
		/** This implementation's identity in the tab system: the key its body and chip register under. */
		const CONSOLE_TYPE = 'dsh-run-environment/run-console';
		/** The right Sidebar's navigation face while it is mounted, null otherwise. */
		let sidebarRight = null;

		/**
		 * The address one run's console is recorded under. The address is the tab's
		 * identity, so every command keeps its own console and re-running one
		 * focuses the console it already has instead of opening a second.
		 * @param {string} sessionId - the conversation the console belongs to.
		 * @param {string} id - the command id.
		 * @returns {string} a `dsh-resource://` address.
		 */
		function consoleAddress(sessionId, id) {
			return `dsh-resource://${CONSOLE_KIND}/${encodeURIComponent(sessionId)}/${encodeURIComponent(id)}`;
		}
		/** The namespace-bound translate, replaced when the plugin applies. */
		let translate = (key) => key;

		/**
		 * How one run reads on screen: the state word and the dot's tone.
		 * @param {object | null} run - the run payload from the host.
		 * @returns {{key: string, dot: string}} the status to render.
		 */
		function statusOf(run) {
			if (run === null) return { key: 'console.unknown', dot: 'idle' };
			if (run.state === 'running') return { key: 'console.running', dot: 'done' };
			if (run.stopped === true) return { key: 'console.stopped', dot: 'idle' };
			if (run.failed === true || (typeof run.exitCode === 'number' && run.exitCode !== 0)) {
				return { key: 'console.failed', dot: 'error' };
			}
			return { key: 'console.done', dot: 'idle' };
		}

		/**
		 * One run's console in the bottom workbench: what was launched, what it has
		 * printed, and the way to stop it. It reads the host's own log route, so the
		 * bytes it shows are the bytes the run produced — the tab is a window, not a
		 * second process.
		 * @param {{useTabInfo: () => {tab: object, visible: boolean}, t: (key: string) => string}} props - the standard tab hooks and copy.
		 * @returns {object} the element.
		 */
		function RunConsole({ useTabInfo, t }) {
			const info = useTabInfo();
			const params = info?.tab?.navigation?.params ?? {};
			// The Sidebar says when a docked body is actually on screen: an expanded
			// column with this tab active. A hidden console stops polling.
			const visible = info?.tab?.visible !== false;
			const cwd = typeof params.cwd === 'string' ? params.cwd : '';
			const id = typeof params.id === 'string' ? params.id : '';
			const [entry, setEntry] = React.useState(null);
			const [failure, setFailure] = React.useState(null);
			const [missing, setMissing] = React.useState(false);
			const [pending, setPending] = React.useState(false);
			const [confirming, setConfirming] = React.useState(false);
			const state = entry?.run?.state ?? null;
			const status = missing ? { key: 'console.unknown', dot: 'idle' } : statusOf(entry?.run ?? null);

			/** Read the run's tail and state once. */
			const refresh = React.useCallback(async () => {
				if (cwd === '' || id === '') return;
				try {
					const payload = await call(`/log?format=json&cwd=${encodeURIComponent(cwd)}&id=${encodeURIComponent(id)}`);
					setEntry({ run: payload.run ?? null, output: typeof payload.output === 'string' ? payload.output : '' });
					setMissing(false);
					setFailure(null);
				} catch (error) {
					// 404 is an answer, not a failure: a harness restart forgets its runs,
					// and a process that outlived one cannot be followed any more. Say so
					// and leave the console readable.
					if (error?.status === 404) {
						setMissing(true);
						setFailure(null);
						return;
					}
					// Anything else — the host restarting mid-poll, a dropped connection —
					// is a hiccup: keep the output already on screen and say so.
					setFailure(error instanceof Error ? error.message : String(error));
				}
			}, [cwd, id]);

			React.useEffect(() => {
				if (!visible) return undefined;
				void refresh();
				// Live runs are polled quickly, a run nobody knows about slowly (it may be
				// about to exist), and a finished one slowly too — the same console shows
				// the next run of its command, and the side panel keeps no other signal.
				const cadence = state === 'running' ? 1000 : state === null ? 3000 : 5000;
				const timer = setInterval(() => {
					void refresh();
				}, cadence);
				return () => {
					clearInterval(timer);
				};
			}, [refresh, state, visible]);

			/** Stop the run behind this console, after asking. */
			const stop = async () => {
				setConfirming(false);
				setPending(true);
				try {
					await call('/stop', { method: 'POST', body: { cwd, id } });
				} catch (error) {
					setFailure(error instanceof Error ? error.message : String(error));
				} finally {
					setPending(false);
					await refresh();
				}
			};

			const output = entry?.output ?? '';
			return h(
				'div',
				{ className: styles.console },
				h(
					'div',
					{ className: styles.consoleBar },
					h(StateDot, { state: status.dot, size: 9 }),
					h('span', { className: styles.consoleStatus }, t(status.key)),
					h('code', { className: styles.consoleCommand }, typeof params.command === 'string' ? params.command : ''),
					h('span', { className: styles.consoleSpacer }),
					state === 'running'
						? h(
								Button,
								{
									variant: 'outline',
									disabled: pending,
									onClick: () => {
										setConfirming(true);
									},
								},
								t('stop.confirm'),
							)
						: null,
				),
				failure === null
					? null
					: h('div', { className: styles.consoleFailure, title: failure }, t('console.offline')),
				output === ''
					? h('div', { className: styles.consoleEmpty }, t(state === null ? 'console.unknown' : 'console.empty'))
					: h('pre', { className: styles.consoleOutput }, output),
				h(StopCommandDialog, {
					open: confirming,
					draft: { id, label: typeof params.label === 'string' ? params.label : id },
					pending,
					t,
					onClose: () => {
						setConfirming(false);
					},
					onSubmit: () => {
						void stop();
					},
				}),
			);
		}

		/**
		 * The console chip: the command's own name, so two consoles never read alike.
		 * @param {{useTabInfo: () => object}} props - the standard tab hook.
		 * @returns {string} the chip text.
		 */
		function ConsoleTitle({ useTabInfo }) {
			const params = useTabInfo()?.tab?.navigation?.params ?? {};
			return typeof params.label === 'string' ? params.label : translate('console.tab');
		}

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
			/** Sections whose hidden commands are revealed, keyed by section title. */
			const [revealed, setRevealed] = React.useState(() => new Set());
			/** The row being dragged, and where it would land. */
			const [dragging, setDragging] = React.useState(null);
			const [dropTarget, setDropTarget] = React.useState(null);
			/** The running command whose status dot asked to confirm stopping it. */
			const [stopDraft, setStopDraft] = React.useState(null);
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
			// The host already orders this. The view applies the same two rules
			// again, and for the same reason the host does: whichever build ends up
			// talking to which, the default must lead and hidden rows must not sit
			// among the runnable ones. The sort is stable, so everything else keeps
			// the order it was served in.
			const commands = (Array.isArray(data?.commands) ? [...data.commands] : []).sort(
				(left, right) =>
					(left.hidden === true ? 1 : 0) - (right.hidden === true ? 1 : 0) ||
					(left.id === data?.defaultId ? 0 : 1) - (right.id === data?.defaultId ? 0 : 1),
			);
			const icons = Array.isArray(data?.icons) && data.icons.length > 0 ? data.icons : ['default'];
			const detected = commands.filter((command) => command.source === 'detected');
			const custom = commands.filter((command) => command.source === 'custom');
			const visible = commands.filter((command) => !command.hidden);
			const current = visible.find((command) => command.id === data?.defaultId) ?? visible[0] ?? null;
			const runs = Array.isArray(data?.runs) ? data.runs : [];
			const runningIds = new Set(runs.filter((run) => run.state === 'running').map((run) => run.id));
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
				// A hidden command only appears where it can be taken back out of
				// hiding, which is what the section's eye is for.
				if (command.hidden && !revealed.has(title)) continue;
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
			// Anything alive keeps the menu polling, so a status dot appears and
			// disappears without the user having to reopen the list.
			const busy = pending || runningIds.size > 0 || failure !== null;
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

			/**
			 * Show one run in the harness's own right Sidebar. Each command keeps its
			 * own tab, so a second command opens a second console rather than
			 * overwriting the first, and re-running one focuses the console it has.
			 * @param {object} entry - the command being launched.
			 */
			const openConsole = React.useCallback(
				(entry) => {
					if (sidebarRight === null || typeof sessionId !== 'string') return;
					sidebarRight.openResource(consoleAddress(sessionId, entry.id), {
						kind: CONSOLE_KIND,
						params: { cwd, id: entry.id, label: entry.label, command: entry.command },
					});
				},
				[cwd, sessionId],
			);

			const runCommand = React.useCallback(
				(id, kind) => {
					if (!workspaceReady) return;
					const entry = commands.find((command) => command.id === id) ?? null;
					void submit(async () => {
						const result = await call(kind === 'stop' ? '/stop' : '/run', { method: 'POST', body: { cwd, id } });
						if (kind === 'run' && entry !== null) openConsole(entry);
						return result;
					}, id);
				},
				[cwd, workspaceReady, submit, commands, openConsole],
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
							? t('action.confirmStop', { command })
							: current === null
								? t('action.empty')
								: t('action.run', { command });
			const description = current?.description ?? '';
			const title = [base, detail, description].filter((part) => part !== '').join(' — ');
			const diagnostic = failure === null ? '' : lastLine(failure.detail);
			const fullTitle = state === 'error' && diagnostic !== '' ? `${title} — ${diagnostic}` : title;

			/**
			 * One command row: its icon on the left (the menu's own icon slot), its
			 * name, and the options handle on the right.
			 * @param {object} entry - the command.
			 * @returns {object} the item label node.
			 */
			/**
			 * A row's leading glyph: the harness status dot while the command is
			 * alive — green, and the way to stop it — or the icon it was given.
			 * @param {object} entry - the command.
			 * @returns {object} the node for the menu's icon slot.
			 */
			const rowGlyph = (entry) => {
				if (runningIds.has(entry.id)) {
					const label = t('stop.title', { command: entry.label });
					return h(
						'span',
						{
							role: 'button',
							tabIndex: -1,
							draggable: false,
							className: styles.status,
							'aria-label': label,
							title: label,
							onClick: (event) => {
								// The dot stops the command, so it must not also run it.
								event.preventDefault();
								event.stopPropagation();
								setStopDraft(entry);
							},
						},
						h(StateDot, { state: 'done', size: 9 }),
					);
				}
				return h('span', {
					className: entry.hidden === true ? styles.dim : undefined,
					children: h(CommandIcon, { icon: entry.icon }),
				});
			};

			/**
			 * Move one row next to another and remember the result.
			 * @param {string} moved - the id being dragged.
			 * @param {string} target - the id it was dropped on.
			 * @param {boolean} after - drop below the target rather than above it.
			 */
			const moveRow = (moved, target, after) => {
				if (moved === null || moved === target) return;
				const ids = commands.map((entry) => entry.id);
				if (!ids.includes(moved) || !ids.includes(target)) return;
				const next = ids.filter((id) => id !== moved);
				const at = next.indexOf(target) + (after ? 1 : 0);
				next.splice(at, 0, moved);
				mutate({ action: 'reorder', order: next }, moved);
			};

			/**
			 * Where a drop would land, from the pointer's position over the row.
			 * @param {object} event - the drag event.
			 * @returns {boolean} true when the drop goes below the row's middle.
			 */
			const dropsBelow = (event) => {
				const rect = event.currentTarget.getBoundingClientRect();
				return event.clientY > rect.top + rect.height / 2;
			};

			const rowLabel = (entry) =>
				h(
					'span',
					{
						title: entry.description === '' ? undefined : entry.description,
						className:
							`${styles.row}${entry.hidden === true ? ` ${styles.dim}` : ''}` +
							(dragging === entry.id ? ` ${styles.dragging}` : '') +
							(dropTarget?.id === entry.id
								? ` ${dropTarget.after ? styles.dropAfter : styles.dropBefore}`
								: ''),
						draggable: true,
						onDragStart: (event) => {
							setDragging(entry.id);
							event.dataTransfer.effectAllowed = 'move';
							// A drag needs a payload to start in every browser.
							event.dataTransfer.setData('text/plain', entry.id);
						},
						onDragOver: (event) => {
							if (dragging === null || dragging === entry.id) return;
							event.preventDefault();
							event.dataTransfer.dropEffect = 'move';
							setDropTarget({ id: entry.id, after: dropsBelow(event) });
						},
						onDrop: (event) => {
							event.preventDefault();
							event.stopPropagation();
							moveRow(dragging, entry.id, dropsBelow(event));
							setDragging(null);
							setDropTarget(null);
						},
						onDragEnd: () => {
							setDragging(null);
							setDropTarget(null);
						},
					},
					// The badge is fixed and the name is the flexible part, so a long
					// command truncates instead of squeezing the badge out.
					h('span', { className: styles.rowLabel }, entry.label),
					entry.id === data.defaultId ? h(Pill, { className: styles.badge }, t('row.default')) : null,
					h(
						'span',
						{
							role: 'button',
							tabIndex: -1,
							draggable: false,
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

			/** Reveal or re-hide one section's hidden commands. */
			const toggleRevealed = (title) => {
				setRevealed((previous) => {
					const next = new Set(previous);
					if (next.has(title)) next.delete(title);
					else next.add(title);
					return next;
				});
			};

			/**
			 * One section heading: the file that declared the commands, and the eye
			 * that decides whether its hidden ones are on screen.
			 * @param {string} title - the section title.
			 * @returns {object} the label node.
			 */
			const groupLabel = (title) => {
				const showing = revealed.has(title);
				const label = showing ? t('group.showLess') : t('group.showAll');
				return h(
					'span',
					{ className: styles.group },
					h('span', { className: styles.groupTitle }, title),
					h(
						'span',
						{
							role: 'button',
							tabIndex: -1,
							className: styles.reveal,
							'data-on': showing,
							'aria-pressed': showing,
							title: label,
							onClick: () => {
								toggleRevealed(title);
							},
						},
						label,
					),
				);
			};

			const items = [];
			for (const group of groups) {
				items.push({ type: 'label', id: `ui:group:${group.title}`, text: groupLabel(group.title) });
				for (const entry of group.commands) {
					items.push({ id: entry.id, label: rowLabel(entry), icon: rowGlyph(entry) });
				}
			}
			if (custom.length > 0) {
				items.push({ type: 'label', id: 'ui:group:custom', text: t('menu.custom') });
				for (const entry of custom) {
					items.push({ id: entry.id, label: rowLabel(entry), icon: rowGlyph(entry) });
				}
			}
			items.push({ type: 'separator', id: 'ui:separator:manage' });
			items.push({ type: 'label', id: 'ui:group:manage', text: t('menu.manage') });
			items.push({ id: UI.add, label: t('menu.add'), icon: h(IconPlusOutline16, { size: 14 }) });

			/** Route one menu selection to a run, a state change, or a dialog. */
			const onSelect = (id) => {
				setOpen(false);
				if (pending) return;
				if (id === UI.add) {
					setDialogError(null);
					setAddDraft({ label: '', command: '', description: '', icon: 'default' });
					return;
				}
				// A revealed hidden command is on screen to be managed, not run.
				if (commands.some((command) => command.id === id && command.hidden === true)) return;
				// A row that is already alive asks before it stops: the status dot
				// says what is running, and the row is both how it starts and how it
				// ends. The header button wears a stop icon, so that one stops
				// outright.
				const live = commands.find((command) => command.id === id);
				if (live !== undefined && runningIds.has(id)) {
					setStopDraft(live);
					return;
				}
				runCommand(id, 'run');
			};

			const actionTarget = actions === null ? null : (commands.find((entry) => entry.id === actions.id) ?? null);
			const iconClass = state === 'pending' ? `${styles.icon} ${styles.spin}` : styles.icon;
			// A live command wears the same green status dot here as it does in the
			// list: "something is running" reads the same wherever you look. The
			// click is still the way to stop it, which the tooltip says.
			const glyph = running
				? h('span', { className: styles.buttonStatus }, h(StateDot, { state: 'done', size: 9 }))
				: h(state === 'pending' ? IconLoadingOutline16 : IconPlayOutline16, { size: 15, className: iconClass });
			const main = h(
				'button',
				{
					type: 'button',
					className: styles.main,
					'data-state': state,
					disabled: pending || current === null,
					'aria-label': fullTitle,
					onClick: () => {
						if (current === null) return;
						// Every way of stopping goes through the confirmation: the
						// button, the row, and the status dot all ask first.
						if (running) {
							setStopDraft(current);
							return;
						}
						runCommand(current.id, 'run');
					},
				},
				glyph,
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
								// A hidden command cannot be run, so offering to make it the
								// default would be offering something the host refuses.
								...(actionTarget.hidden === true
									? []
									: [
											{
												id: UI.setDefault,
												label: optionLabel(t('actions.setDefault'), IconCheckOutline16),
												disabled: actionTarget.id === data.defaultId,
											},
										]),
								{
									id: UI.edit,
									label: optionLabel(t('actions.edit'), IconEditOutline16),
								},
								// A command this plugin owns is deleted; one that belongs to a
								// manifest is hidden, and revealed again by the same menu.
								...(actionTarget.source === 'custom'
									? [
											{
												id: UI.delete,
												label: optionLabel(t('actions.delete'), IconTrashOutline16),
												danger: true,
											},
										]
									: actionTarget.hidden === true
										? [
												{
													id: UI.show,
													label: optionLabel(t('actions.show'), EyeOpenIcon),
												},
											]
										: [
												{
													id: UI.hide,
													label: optionLabel(t('actions.hide'), EyeOffIcon),
												},
											]),
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
								if (id === UI.hide || id === UI.show) {
									mutate({ action: id === UI.hide ? 'hide' : 'show', id: target.id }, target.id);
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
									description: target.description,
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
					const next = addDraft ?? { label: '', command: '', description: '', icon: 'default' };
					if (next.label.trim() === '' || next.command.trim() === '') return;
					void submitDialog(
						() =>
							call('/state', {
								method: 'POST',
								body: {
									cwd,
									action: 'add-custom',
									label: next.label,
									command: next.command,
									description: next.description,
									icon: next.icon,
								},
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
					const body = {
						cwd,
						action: 'edit',
						id: next.id,
						label: next.label,
						description: next.description,
						icon: next.icon,
					};
					void submitDialog(() => call('/state', { method: 'POST', body }), () => {
						setEditDraft(null);
					});
				},
			});

			const stopDialog = h(StopCommandDialog, {
				open: stopDraft !== null,
				draft: stopDraft,
				pending,
				t,
				onClose: () => {
					setStopDraft(null);
				},
				onSubmit: () => {
					const target = stopDraft;
					if (target === null) return;
					setStopDraft(null);
					runCommand(target.id, 'stop');
				},
			});

			return h(React.Fragment, null, menu, options, addDialog, editDialog, stopDialog);
		}
		//#endregion

		//#region locales
		/** Dictionary namespace owned by this plugin. */
		const NS = 'run-environment';
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			'action.run': '运行 {command}',
			'action.confirmStop': '询问后停止 {command}',
			'action.pending': '正在启动 {command}',
			'action.failed': '运行失败：{command}',
			'action.empty': '没有可用命令',
			'menu.version': 'dsh-run-environment',
			'menu.toggle': '选择要运行的命令',
			'menu.aria': '项目命令',
			'menu.custom': '自定义',
			'menu.manage': '管理',
			'menu.add': '添加命令…',
			'row.default': '默认',
			'row.options': '“{command}”的选项',
			'actions.setDefault': '设为默认',
			'actions.edit': '编辑',
			'actions.delete': '删除',
			'actions.hide': '隐藏',
			'actions.show': '取消隐藏',
			'group.showAll': '显示全部',
			'group.showLess': '收起',
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
			'edit.commandLocked': '此处无法修改命令行。',
			'field.description': '描述',
			'field.descriptionPlaceholder': '构建站点并上传',
			'field.descriptionHint': '可选。悬停命令时显示。',
			'stop.title': '停止 {command}？',
			'stop.description': '该进程及其启动的所有内容都将被终止。',
			'stop.confirm': '停止',
			'stop.cancel': '取消',
			'console.tab': '运行控制台',
			'console.description': '实时显示所选命令的输出',
			'console.running': '运行中',
			'console.done': '已完成',
			'console.stopped': '已停止',
			'console.failed': '失败',
			'console.unknown': '当前 harness 已不认识该运行（可能已重启）',
			'console.offline': '无法连接 harness —— 正在重试…',
			'console.empty': '暂无输出',
			'edit.save': '保存',
			'edit.cancel': '取消',
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			'action.run': 'Run {command}',
			'action.confirmStop': 'Ask before stopping {command}',
			'action.pending': 'Starting {command}',
			'action.failed': 'Failed: {command}',
			'action.empty': 'No commands',
			'menu.version': 'dsh-run-environment',
			'menu.toggle': 'Choose a command to run',
			'menu.aria': 'Project commands',
			'menu.custom': 'Custom',
			'menu.manage': 'Manage',
			'menu.add': 'Add command…',
			'row.default': 'default',
			'row.options': 'Options for {command}',
			'actions.setDefault': 'Set as default',
			'actions.edit': 'Edit',
			'actions.delete': 'Delete',
			'actions.hide': 'Hide',
			'actions.show': 'Unhide',
			'group.showAll': 'Show all',
			'group.showLess': 'Show less',
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
			'edit.commandLocked': 'The command line cannot be changed here.',
			'field.description': 'Description',
			'field.descriptionPlaceholder': 'Builds the site and uploads it',
			'field.descriptionHint': 'Optional. Shown when hovering the command.',
			'stop.title': 'Stop {command}?',
			'stop.description': 'The command and everything it started will be terminated.',
			'stop.confirm': 'Stop',
			'stop.cancel': 'Cancel',
			'console.tab': 'Run console',
			'console.description': 'Live output of the command you launched',
			'console.running': 'Running',
			'console.done': 'Finished',
			'console.stopped': 'Stopped',
			'console.failed': 'Failed',
			'console.unknown': 'This run is no longer known to the harness. It may have restarted.',
			'console.offline': 'Could not reach the harness — retrying…',
			'console.empty': 'No output yet',
			'edit.save': 'Save',
			'edit.cancel': 'Cancel',
		};
		/** Spanish dictionary, key-identical to the Chinese source of truth. */
		const es = {
			'action.run': 'Ejecutar {command}',
			'action.confirmStop': 'Preguntar antes de detener {command}',
			'action.pending': 'Iniciando {command}',
			'action.failed': 'Fallo: {command}',
			'action.empty': 'Sin comandos',
			'menu.version': 'dsh-run-environment',
			'menu.toggle': 'Elegir un comando',
			'menu.aria': 'Comandos del proyecto',
			'menu.custom': 'Personalizados',
			'menu.manage': 'Gestionar',
			'menu.add': 'Añadir comando…',
			'row.default': 'por defecto',
			'row.options': 'Opciones de {command}',
			'actions.setDefault': 'Usar por defecto',
			'actions.edit': 'Editar',
			'actions.delete': 'Borrar',
			'actions.hide': 'Ocultar',
			'actions.show': 'Mostrar',
			'group.showAll': 'Mostrar todos',
			'group.showLess': 'Mostrar menos',
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
			'edit.commandLocked': 'La línea de comando no se puede cambiar aquí.',
			'field.description': 'Descripción',
			'field.descriptionPlaceholder': 'Compila el sitio y lo sube',
			'field.descriptionHint': 'Opcional. Se muestra al pasar el ratón por el comando.',
			'stop.title': '¿Detener {command}?',
			'stop.description': 'Se terminará el comando y todo lo que haya lanzado.',
			'stop.confirm': 'Detener',
			'stop.cancel': 'Cancelar',
			'console.tab': 'Consola de ejecución',
			'console.description': 'Salida en vivo del comando que lanzaste',
			'console.running': 'En ejecución',
			'console.done': 'Terminado',
			'console.stopped': 'Detenido',
			'console.failed': 'Falló',
			'console.unknown': 'El harness ya no conoce esta ejecución. Puede que se haya reiniciado.',
			'console.offline': 'No se pudo contactar con el harness — reintentando…',
			'console.empty': 'Todavía sin salida',
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
			translate = ctx.locale.bind(NS);
			// The console lives in the harness's own right Sidebar, through its public
			// two-stage path: the type into the registry, the body and the chip into
			// their keyed seats. Both services are optional, so a client without that
			// Sidebar still runs commands — it just has no console to show them in.
			ctx.inject(['sidebarRightTabs', 'sidebarRight'], (rightCtx) => {
				rightCtx.effect(() => {
					sidebarRight = rightCtx.sidebarRight;
					const dispose = rightCtx.sidebarRightTabs.register({
						id: CONSOLE_TYPE,
						kind: CONSOLE_KIND,
						// An address family of its own: the Sidebar records one tab per
						// address, which is what makes each command's console its own.
						patterns: [`dsh-resource://${CONSOLE_KIND}/**`],
						title: () => translate('console.tab'),
					});
					return () => {
						sidebarRight = null;
						dispose();
					};
				}, 'dsh-run-environment: run console type');
				rightCtx.effect(
					() =>
						rightCtx.slots.inject('sidebar.right.pane.tab', () =>
							rightCtx.slots.register(
								{ name: 'sidebar.right.pane.tab', key: CONSOLE_TYPE, locale: NS, inject: () => ({}) },
								RunConsole,
							),
						),
					'dsh-run-environment: run console body',
				);
				rightCtx.effect(
					() =>
						rightCtx.slots.inject('sidebar.right.pane.tab.title', () =>
							rightCtx.slots.register(
								{ name: 'sidebar.right.pane.tab.title', key: CONSOLE_TYPE, locale: NS, inject: () => ({}) },
								ConsoleTitle,
							),
						),
					'dsh-run-environment: run console chip',
				);
			});
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
