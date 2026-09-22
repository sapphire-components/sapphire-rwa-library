import DOMPurify from 'dompurify';
import Helpers from '@utils/helpers';
import ckeditorCss from 'ckeditor5/ckeditor5.css?inline';
import overridesCss from './ckeditor-overrides.css?inline';
import { Alignment, Bold, ClassicEditor, Essentials, Font, Fullscreen, Italic, List, Paragraph, RemoveFormat, SourceEditing, Strikethrough, Table, TableToolbar, Underline } from 'ckeditor5';
import { BaseComponent, type BaseComponentInit } from '@core/base';

const RESIZE_DEBOUNCE_MS = 100;
const READ_ONLY_LOCK = 'sapphire-rwa-ckeditor';
const CKEDITOR_STYLE_ID = 'sapphire-rwa-ckeditor-css';
const EMPTY_HTML = new Set(['', '<p></p>', '<p><br></p>', '<p>&nbsp;</p>', '<p> </p>']);

function ensureCkeditorStyles(): void {
	if (document.getElementById(CKEDITOR_STYLE_ID)) return;

	const style = document.createElement('style');
	style.id = CKEDITOR_STYLE_ID;
	style.textContent = `${ckeditorCss}\n${overridesCss}`;
	document.head.appendChild(style);
}

const EDITOR_PLUGINS = [Essentials, Paragraph, Bold, Italic, Underline, Strikethrough, Font, Alignment, List, Table, TableToolbar, RemoveFormat, SourceEditing, Fullscreen];

const EDITOR_TOOLBAR = [
	'fontSize',
	'bold',
	'italic',
	'underline',
	'strikethrough',
	'|',
	'fontColor',
	'fontBackgroundColor',
	'|',
	'alignment',
	'|',
	'numberedList',
	'bulletedList',
	'|',
	'insertTable',
	'|',
	'removeFormat',
	'|',
	'sourceEditing',
	'fullscreen',
];

function normalizeHtml(html: string): string {
	const withSpaces = html.replace(/&nbsp;|\u00A0/g, ' ');
	const compact = withSpaces.replace(/\s+/g, ' ').trim();
	if (EMPTY_HTML.has(compact)) return '';
	return withSpaces;
}

function htmlToText(html: string): string {
	const tmp = document.createElement('div');
	tmp.innerHTML = html;
	return (tmp.textContent ?? '')
		.replace(/\u00A0/g, ' ')
		.replace(/\n+/g, '\n')
		.trim();
}

export interface ICKEditor extends BaseComponentInit {
	actions: {
		OnBlur: () => void;
		OnChange: (text: string, html: string) => void;
		OnFocus: () => void;
	};
	content: string;
	enabled: boolean;
	hasToolbar: boolean;
	height: number;
	placeholder: string;
}

export default class CKEditor extends BaseComponent {
	#actions!: ICKEditor['actions'];
	#blur = this.blur.bind(this);
	#destroyed = false;
	#editor: ClassicEditor | null = null;
	#enabled!: boolean;
	#focus = this.focus.bind(this);
	#handleMouseEnter = this.handleMouseEnter.bind(this);
	#handleMouseLeave = this.handleMouseLeave.bind(this);
	#hasToolbar!: boolean;
	#height!: number;
	#hostEl!: HTMLElement;
	#placeholder!: string;
	#ready: Promise<ClassicEditor | null>;
	#resizeDebounced?: ((...args: Parameters<ResizeObserverCallback>) => void) & { cancel: () => void };
	#resizeObserver?: ResizeObserver;
	#silentSet = false;

	constructor(config: ICKEditor) {
		super(config);

		if (!this.widgetEl) {
			console.warn('CKEditor: root element not found for runtimeId', config.runtimeId);
			this.#ready = Promise.resolve(null);
			return;
		}

		ensureCkeditorStyles();

		this.#actions = config.actions;
		this.#enabled = config.enabled;
		this.#hasToolbar = config.hasToolbar;
		this.#height = config.height;
		this.#placeholder = config.placeholder;

		this.widgetEl.dataset.enabled = String(this.#enabled);
		this.widgetEl.dataset.hastoolbar = String(this.#hasToolbar);

		this.#hostEl = this.widgetEl.querySelector('.ckeditor-host') as HTMLElement;
		if (!this.#hostEl) {
			this.#hostEl = document.createElement('div');
			this.#hostEl.className = 'ckeditor-host';
			this.widgetEl.appendChild(this.#hostEl);
		}

		this.widgetEl.addEventListener('mouseenter', this.#handleMouseEnter);
		this.widgetEl.addEventListener('mouseleave', this.#handleMouseLeave);

		this.applyHeight();

		this.#resizeDebounced = Helpers.debounce(() => {
			this.applyHeight();
		}, RESIZE_DEBOUNCE_MS);
		this.#resizeObserver = new ResizeObserver(this.#resizeDebounced);
		this.#resizeObserver.observe(this.widgetEl);

		this.#ready = this.createEditor(config.content ?? '');
	}

	parametersChanged(payload: ICKEditor): void {
		if (!Helpers.areTheyEqual(payload.enabled, this.#enabled)) {
			this.#enabled = payload.enabled;
			this.widgetEl.dataset.enabled = String(this.#enabled);
			void this.applyEnabled();
		}
	}

	destroy(): void {
		this.#destroyed = true;

		this.#resizeDebounced?.cancel();
		this.#resizeDebounced = undefined;
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = undefined;

		this.widgetEl?.removeEventListener('mouseenter', this.#handleMouseEnter);
		this.widgetEl?.removeEventListener('mouseleave', this.#handleMouseLeave);

		void this.#ready.then((editor) => {
			editor?.destroy();
		});
		this.#editor = null;

		super.destroy();
	}

	setHtml(incomingHtml: string): void {
		void this.#ready.then((editor) => {
			if (!editor || this.#destroyed) return;
			const safeHtml = DOMPurify.sanitize(incomingHtml ?? '', {
				USE_PROFILES: { html: true },
			});
			this.#silentSet = true;
			editor.setData(safeHtml);
			this.#silentSet = false;
		});
	}

	private async createEditor(content: string): Promise<ClassicEditor | null> {
		try {
			const editor = await ClassicEditor.create({
				attachTo: this.#hostEl,
				licenseKey: 'GPL',
				plugins: EDITOR_PLUGINS,
				toolbar: EDITOR_TOOLBAR,
				placeholder: this.#placeholder,
				fontSize: {
					options: [{ title: 'Small', model: 'small' }, 'default', { title: 'Large', model: 'big' }, { title: 'Huge', model: 'huge' }],
				},
				table: {
					contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
				},
				fullscreen: {
					menuBar: {
						isVisible: false,
					},
				},
				root: {
					initialData: content || '',
				},
			});

			if (this.#destroyed) {
				await editor.destroy();
				return null;
			}

			this.#editor = editor;
			this.attachEditorEvents(editor);
			await this.applyEnabled();
			this.applyHeight();
			return editor;
		} catch (error) {
			console.error('CKEditor: failed to create editor', error);
			return null;
		}
	}

	private attachEditorEvents(editor: ClassicEditor): void {
		editor.model.document.on('change:data', () => {
			if (this.#silentSet) return;
			const html = normalizeHtml(editor.getData());
			const text = htmlToText(html);
			this.#actions.OnChange(text, html);
		});

		editor.editing.view.document.on('focus', this.#focus);
		editor.editing.view.document.on('blur', this.#blur);
	}

	private async applyEnabled(): Promise<void> {
		const editor = this.#editor ?? (await this.#ready);
		if (!editor || this.#destroyed) return;

		if (this.#enabled) {
			editor.disableReadOnlyMode(READ_ONLY_LOCK);
		} else {
			editor.enableReadOnlyMode(READ_ONLY_LOCK);
		}
	}

	private applyHeight(): void {
		if (!this.#height || !this.widgetEl) return;
		// Prefer a CSS custom property on the widget: CKEditor re-renders the
		// editable on focus/blur and clears inline styles, which caused height jumps.
		this.widgetEl.style.setProperty('--ckeditor-height', `${this.#height}px`);
	}

	handleMouseEnter(): void {
		this.widgetEl.dataset.ishovered = 'true';
	}

	handleMouseLeave(): void {
		this.widgetEl.dataset.ishovered = 'false';
	}

	blur(): void {
		this.#actions.OnBlur();
	}

	focus(): void {
		this.#actions.OnFocus();
	}
}
