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
		const Tooltip = primitives.Tooltip;
		const IconChevronDownOutline14 = primitives.IconChevronDownOutline14;
		const IconCodeOutline16 = primitives.IconCodeOutline16;
		const IconListPenOutline16 = primitives.IconListPenOutline16;
		const IconLoadingOutline16 = primitives.IconLoadingOutline16;
		const IconPlayOutline16 = primitives.IconPlayOutline16;
		const IconPlusOutline16 = primitives.IconPlusOutline16;
		const IconStopFill16 = primitives.IconStopFill16;
		const h = React.createElement;

		//#region styles
		const css =
			'.RUNENV_split{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);height:28px;font-family:var(--dsw-font-family);border-radius:14px;align-items:stretch;display:inline-flex;overflow:hidden;flex:none}' +
			'.RUNENV_main,.RUNENV_chevron{color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;background:0 0;border:0;align-items:center;gap:5px;font-size:11px;font-weight:400;line-height:16px;display:inline-flex}' +
			'.RUNENV_main{padding:5px 6px 5px 7px;max-width:240px}' +
			'.RUNENV_main:hover:not(:disabled),.RUNENV_main:focus-visible,.RUNENV_chevron:hover,.RUNENV_chevron:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}' +
			'.RUNENV_main:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}' +
			'.RUNENV_main[data-state=error]{color:var(--dsw-alias-state-error-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-error-primary)}' +
			'.RUNENV_chevron{border-left:.5px solid var(--dsw-alias-border-l4);color:var(--dsw-alias-label-secondary);padding:5px 6px 5px 4px}' +
			'.RUNENV_icon{flex:none}' +
			'.RUNENV_label{overflow:hidden;text-overflow:ellipsis;font-family:var(--dsw-font-markdown-code-font-family,ui-monospace,SFMono-Regular,Menlo,monospace)}' +
			'.RUNENV_spin{animation:RUNENV_rotate 1s linear infinite}' +
			'@keyframes RUNENV_rotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}' +
			'.RUNENV_form{display:flex;flex-direction:column;gap:12px;min-width:320px}' +
			'.RUNENV_field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--dsw-alias-label-secondary)}' +
			'.RUNENV_hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}';
		const styles = {
			split: 'RUNENV_split',
			main: 'RUNENV_main',
			chevron: 'RUNENV_chevron',
			icon: 'RUNENV_icon',
			label: 'RUNENV_label',
			spin: 'RUNENV_spin',
			form: 'RUNENV_form',
			field: 'RUNENV_field',
			hint: 'RUNENV_hint',
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

		//#region wire
		/** Host prefix every operation lives under. */
		const ROUTE_PREFIX = '/run-environment';
		/** Poll cadence while something is starting, running, or showing an error. */
		const POLL_MS = 2000;
		/** How long a failed launch keeps the error dress. */
		const ERROR_MS = 8000;
		/** Menu ids owned by the control itself; command ids always contain a colon. */
		const UI = {
			add: 'ui:add',
			hide: 'ui:hide',
			show: 'ui:show',
			delete: 'ui:delete',
			hidePrefix: 'ui:hide:',
			showPrefix: 'ui:show:',
			deletePrefix: 'ui:delete:',
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

		/** Last non-empty line of a diagnostic tail, for a one-line tooltip. */
		function lastLine(text) {
			if (typeof text !== 'string') return '';
			const lines = text.split('\n').filter((line) => line.trim() !== '');
			return lines.length === 0 ? '' : lines[lines.length - 1].trim();
		}
		//#endregion

		//#region dialog
		/**
		 * The "add a command" dialog: a label and the command line to run.
		 * @param {object} props - dialog state and callbacks.
		 * @returns {object} the modal element.
		 */
		function AddCommandDialog({ open, draft, pending, error, t, onChange, onClose, onSubmit }) {
			const label = draft?.label ?? '';
			const command = draft?.command ?? '';
			const valid = label.trim() !== '' && command.trim() !== '';
			const field = (key, title, placeholder) =>
				h(
					'label',
					{ className: styles.field },
					title,
					h(Input, {
						value: key === 'label' ? label : command,
						placeholder,
						'aria-label': title,
						onChange: (event) => {
							onChange({ ...draft, [key]: event.target.value });
						},
					}),
				);
			return h(
				Modal,
				{
					open,
					onClose,
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
					field('label', t('dialog.label'), t('dialog.labelPlaceholder')),
					field('command', t('dialog.command'), t('dialog.commandPlaceholder')),
					h('span', { className: styles.hint }, t('dialog.hint')),
					error === null ? null : h('span', { className: styles.hint }, error),
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
			const [draft, setDraft] = React.useState(null);
			const [dialogError, setDialogError] = React.useState(null);
			const failureTimer = React.useRef(undefined);
			React.useEffect(
				() => () => {
					clearTimeout(failureTimer.current);
				},
				[],
			);

			/** Show one launch failure for a bounded time. */
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
			const detected = commands.filter((command) => command.source === 'detected' && !command.hidden);
			const custom = commands.filter((command) => command.source === 'custom');
			const hidden = commands.filter((command) => command.hidden);
			const visible = commands.filter((command) => !command.hidden);
			const current = visible.find((command) => command.id === data?.defaultId) ?? visible[0] ?? null;
			const runs = Array.isArray(data?.runs) ? data.runs : [];
			const active = runs.find((run) => run.id === current?.id && run.state === 'running') ?? null;
			const crashed = runs.find((run) => run.id === current?.id && run.failed === true) ?? null;
			const failureKey = crashed === null ? null : `${crashed.id}:${String(crashed.endedAt)}`;

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

			const items = [];
			if (detected.length > 0) {
				items.push({ type: 'label', id: 'ui:label:detected', text: t('menu.detected') });
				for (const entry of detected) {
					items.push({ id: entry.id, label: entry.command, icon: h(IconCodeOutline16, { size: 14 }) });
				}
			}
			if (custom.length > 0) {
				items.push({ type: 'label', id: 'ui:label:custom', text: t('menu.custom') });
				for (const entry of custom) {
					items.push({ id: entry.id, label: entry.command, icon: h(IconListPenOutline16, { size: 14 }) });
				}
			}
			items.push({ type: 'separator', id: 'ui:separator:manage' });
			items.push({ type: 'label', id: 'ui:label:manage', text: t('menu.manage') });
			items.push({ id: UI.add, label: t('menu.add'), icon: h(IconPlusOutline16, { size: 14 }) });
			if (detected.length > 0) {
				items.push({
					id: UI.hide,
					label: t('menu.hide'),
					submenu: detected.map((entry) => ({ id: `${UI.hidePrefix}${entry.id}`, label: entry.command })),
				});
			}
			if (hidden.length > 0) {
				items.push({
					id: UI.show,
					label: t('menu.show', { count: String(hidden.length) }),
					submenu: hidden.map((entry) => ({ id: `${UI.showPrefix}${entry.id}`, label: entry.command })),
				});
			}
			if (custom.length > 0) {
				items.push({
					id: UI.delete,
					label: t('menu.delete'),
					danger: true,
					submenu: custom.map((entry) => ({ id: `${UI.deletePrefix}${entry.id}`, label: entry.command })),
				});
			}

			/** Route one menu selection to a run, a state change, or the dialog. */
			const onSelect = (id) => {
				setOpen(false);
				if (pending) return;
				if (id === UI.add) {
					setDialogError(null);
					setDraft({ label: '', command: '' });
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
				if (id.startsWith(UI.deletePrefix)) {
					mutate({ action: 'remove-custom', id: id.slice(UI.deletePrefix.length) }, id);
					return;
				}
				runCommand(id, running && id === current?.id ? 'stop' : 'run');
			};

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
				h('span', { className: styles.label }, current === null ? t('action.empty') : command),
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
				selection: 'fill',
				onClose: () => {
					setOpen(false);
				},
				items,
				selectedId: current?.id ?? null,
				onSelect,
				anchor: h(
					'div',
					{ className: styles.split },
					h(Tooltip, { label: fullTitle, side: 'bottom' }, main),
					chevron,
				),
			});

			const dialog = h(AddCommandDialog, {
				open: draft !== null,
				draft: draft ?? { label: '', command: '' },
				pending,
				error: dialogError,
				t,
				onChange: setDraft,
				onClose: () => {
					setDraft(null);
					setDialogError(null);
				},
				onSubmit: () => {
					const next = draft ?? { label: '', command: '' };
					if (next.label.trim() === '' || next.command.trim() === '') return;
					setDialogError(null);
					setPending(true);
					void call('/state', {
						method: 'POST',
						body: { cwd, action: 'add-custom', label: next.label, command: next.command },
					})
						.then(() => {
							setDraft(null);
							setRevision((value) => value + 1);
						})
						.catch((error) => {
							setDialogError(error instanceof Error ? error.message : String(error));
						})
						.finally(() => {
							setPending(false);
						});
				},
			});

			return h(React.Fragment, null, menu, dialog);
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
			'menu.toggle': '选择要运行的命令',
			'menu.aria': '项目命令',
			'menu.detected': '已检测',
			'menu.custom': '自定义',
			'menu.manage': '管理',
			'menu.add': '添加命令…',
			'menu.hide': '隐藏命令',
			'menu.show': '显示隐藏的命令（{count}）',
			'menu.delete': '删除自定义命令',
			'dialog.title': '添加命令',
			'dialog.description': '为这个项目定义一个命令。它会在这个项目的工作目录中运行。',
			'dialog.label': '名称',
			'dialog.labelPlaceholder': '启动数据库',
			'dialog.command': '命令',
			'dialog.commandPlaceholder': 'docker compose up -d',
			'dialog.hint': '命令通过你的登录 shell 执行。',
			'dialog.save': '添加',
			'dialog.cancel': '取消',
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			'action.run': 'Run {command}',
			'action.stop': 'Stop {command}',
			'action.pending': 'Starting {command}',
			'action.failed': 'Failed: {command}',
			'action.empty': 'No commands',
			'menu.toggle': 'Choose a command to run',
			'menu.aria': 'Project commands',
			'menu.detected': 'Detected',
			'menu.custom': 'Custom',
			'menu.manage': 'Manage',
			'menu.add': 'Add command…',
			'menu.hide': 'Hide a command',
			'menu.show': 'Show hidden ({count})',
			'menu.delete': 'Delete a custom command',
			'dialog.title': 'Add a command',
			'dialog.description': 'Define a command for this project. It runs in the project directory.',
			'dialog.label': 'Name',
			'dialog.labelPlaceholder': 'Start the database',
			'dialog.command': 'Command',
			'dialog.commandPlaceholder': 'docker compose up -d',
			'dialog.hint': 'The command runs through your login shell.',
			'dialog.save': 'Add',
			'dialog.cancel': 'Cancel',
		};
		/** Spanish dictionary, key-identical to the Chinese source of truth. */
		const es = {
			'action.run': 'Ejecutar {command}',
			'action.stop': 'Detener {command}',
			'action.pending': 'Iniciando {command}',
			'action.failed': 'Fallo: {command}',
			'action.empty': 'Sin comandos',
			'menu.toggle': 'Elegir un comando',
			'menu.aria': 'Comandos del proyecto',
			'menu.detected': 'Detectados',
			'menu.custom': 'Personalizados',
			'menu.manage': 'Gestionar',
			'menu.add': 'Añadir comando…',
			'menu.hide': 'Ocultar un comando',
			'menu.show': 'Mostrar ocultos ({count})',
			'menu.delete': 'Borrar un comando propio',
			'dialog.title': 'Añadir un comando',
			'dialog.description': 'Define un comando para este proyecto. Se ejecuta en su directorio.',
			'dialog.label': 'Nombre',
			'dialog.labelPlaceholder': 'Arrancar la base de datos',
			'dialog.command': 'Comando',
			'dialog.commandPlaceholder': 'docker compose up -d',
			'dialog.hint': 'El comando se ejecuta con tu shell de inicio de sesión.',
			'dialog.save': 'Añadir',
			'dialog.cancel': 'Cancelar',
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
		return module.exports;
	},
});
