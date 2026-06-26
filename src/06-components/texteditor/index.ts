import DOMPurify from 'dompurify';
import Helpers from '../../09-utils/helpers.ts';
import Quill, { type QuillOptions } from 'quill';
import QuillTableBetter from 'quill-table-better';
import quillSnowCss from 'quill/dist/quill.snow.css?inline';
import quillTableBetterCss from 'quill-table-better/dist/quill-table-better.css?inline';
import { BaseComponent, type BaseComponentInit } from '../../core/base.ts';
import { getToolbarTemplate } from './toolbar.ts';

const RESIZE_DEBOUNCE_MS = 100;
const QUILL_STYLE_ID = 'sapphire-rwa-quill-snow';
const QUILL_TABLE_BETTER_STYLE_ID = 'sapphire-rwa-quill-table-better';

function ensureQuillStyles(): void {
	if (!document.getElementById(QUILL_STYLE_ID)) {
		const style = document.createElement('style');
		style.id = QUILL_STYLE_ID;
		style.textContent = quillSnowCss;
		document.head.appendChild(style);
	}

	if (!document.getElementById(QUILL_TABLE_BETTER_STYLE_ID)) {
		const style = document.createElement('style');
		style.id = QUILL_TABLE_BETTER_STYLE_ID;
		style.textContent = quillTableBetterCss;
		document.head.appendChild(style);
	}
}

export interface ITextEditor extends BaseComponentInit {
	actions: {
		OnBlur: () => void;
		OnChange: (text: string, html: string) => void;
		OnFocus: () => void;
	};
	changeDebounce: number;
	content: string;
	enabled: boolean;
	hasToolbar: boolean;
	height: number;
	mode: string;
	placeholder: string;
	theme: string;
	toolbarOptions: string;
}

export default class TextEditor extends BaseComponent {
	#actions!: ITextEditor['actions'];
	#blur = this.blur.bind(this);
	// #changeDebounce!: number;
	#content!: string;
	// #cursorPosition: number | undefined;
	#enabled!: boolean;
	#focus = this.focus.bind(this);
	#handleMouseEnter = this.handleMouseEnter.bind(this);
	#handleMouseLeave = this.handleMouseLeave.bind(this);
	#hasToolbar!: boolean;
	#height!: number;
	#mode!: string;
	#placeholder!: string;
	#quillEditorEl!: HTMLElement;
	#resizeDebounced?: ((...args: Parameters<ResizeObserverCallback>) => void) & { cancel: () => void };
	#resizeObserver?: ResizeObserver;
	// #theme!: string;
	#toolbar!: HTMLElement;
	#toolbarOptions!: string;
	quill: Quill | null = null;

	constructor(config: ITextEditor) {
		super(config);

		console.log('RichTextEditor: constructor', config);

		if (!this.widgetEl) {
			console.warn('RichTextEditor: root element not found for runtimeId', config.runtimeId);
			return;
		}

		ensureQuillStyles();

		this.#actions = config.actions;
		this.#content = config.content;
		this.#enabled = config.enabled;
		this.#hasToolbar = config.hasToolbar;
		this.#height = config.height;
		this.#mode = config.mode;
		this.#placeholder = config.placeholder;
		// this.#theme = config.theme;
		this.#toolbarOptions = config.toolbarOptions;

		this.#quillEditorEl = this.widgetEl.querySelector('.quill-editor') as HTMLElement;

		if (this.#mode === 'html') {
			if (this.#hasToolbar) {
				this.createToolbar();
			}

			Quill.register(
				{
					'modules/table-better': QuillTableBetter,
				},
				true,
			);

			const options: QuillOptions = {
				theme: 'snow',
				modules: {
					toolbar: this.#toolbar,
					table: false,
					'table-better': {
						language: 'en_US',
						toolbarTable: true,
					},
					keyboard: {
						bindings: QuillTableBetter.keyboardBindings,
					},
				},
				placeholder: this.#placeholder,
			};

			this.quill = new Quill(this.#quillEditorEl, options);

			if (this.#content) {
				this.quill.clipboard.dangerouslyPasteHTML(0, this.#content, 'user');
			}

			this.quill.enable(this.#enabled);

			this.attachQuillEvents();

			// console.log(Object.keys(Quill.imports).filter((key) => key.startsWith('formats/')));
		}

		/** Resize observer */
		this.#resizeDebounced = Helpers.debounce((_entries: ResizeObserverEntry[], _observer: ResizeObserver) => {
			this.renderHTMLEditor();
		}, RESIZE_DEBOUNCE_MS);
		this.#resizeObserver = new ResizeObserver(this.#resizeDebounced);
		this.#resizeObserver.observe(this.widgetEl);
	}

	createToolbar(): void {
		const template = document.createElement('template');

		const hasToolbarOption = (value: string) => {
			return this.#toolbarOptions.split(' ').includes(value);
		};

		template.innerHTML = getToolbarTemplate({
			align: hasToolbarOption('align'),
			background: hasToolbarOption('background'),
			bold: hasToolbarOption('bold'),
			clean: hasToolbarOption('clean'),
			color: hasToolbarOption('color'),
			italic: hasToolbarOption('italic'),
			listBullet: hasToolbarOption('list-bullet'),
			listOrdered: hasToolbarOption('list-ordered'),
			size: hasToolbarOption('size'),
			strike: hasToolbarOption('strike'),
			underline: hasToolbarOption('underline'),
			table: hasToolbarOption('table'),
		});

		this.widgetEl.prepend(template.content);

		this.#toolbar = this.widgetEl.querySelector('.texteditor-toolbar') as HTMLElement;
	}

	attachQuillEvents(): void {
		this.#quillEditorEl.addEventListener('mouseenter', this.#handleMouseEnter);
		this.#quillEditorEl.addEventListener('mouseleave', this.#handleMouseLeave);
		// this.#toolbar.addEventListener('mouseleave', this.#handleMouseLeave);

		this.quill?.on('text-change', (_delta, _oldDelta, _source) => {
			let textOutput = this.quill?.getText();
			let htmlOutput = this.quill?.getSemanticHTML(); //this.quill.root.innerHTML;

			if (htmlOutput === '<p><br></p>' || htmlOutput === '<p></p>') {
				htmlOutput = '';
			}

			if (textOutput === '\n') {
				textOutput = '';
			}

			this.#actions.OnChange(textOutput ?? '', htmlOutput ?? '');
		});

		// this.quill?.on('selection-change', (_range, _oldRange, _source) => {
		// 	if (_range) {
		// 		this.#cursorPosition = _range.index;
		// 	} else if (_oldRange) {
		// 		this.#cursorPosition = _oldRange.index;
		// 	}
		// });

		this.quill?.root.addEventListener('blur', this.#blur);
		this.quill?.root.addEventListener('focus', this.#focus);
	}

	parametersChanged(_payload: ITextEditor): void {
		if (!Helpers.areTheyEqual(_payload.enabled, this.#enabled)) {
			console.log('TextEditor: parametersChanged enabled', _payload);
			this.#enabled = _payload.enabled;
			this.quill?.enable(this.#enabled);
		}

		if (!Helpers.areTheyEqual(_payload.content, this.#content)) {
			console.log('TextEditor content', _payload.content, this.#content);
			this.#content = _payload.content;
			this.setQuillHtml(this.#content);
		}
	}

	destroy(): void {
		this.#resizeDebounced?.cancel();
		this.#resizeDebounced = undefined;
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = undefined;

		this.quill?.enable(false);
		this.quill = null;
	}

	renderHTMLEditor(): void {
		if (this.#height) this.#quillEditorEl.style.height = `${this.#height}px`;
	}

	handleMouseEnter(): void {
		this.widgetEl.dataset.ishovered = 'true';
	}

	handleMouseLeave(_e: MouseEvent): void {
		// if ((this.#toolbar && this.#toolbar.contains(e.relatedTarget as Node)) || (this.#editorEl && this.#editorEl.contains(e.relatedTarget as Node))) {
		// 	return;
		// }
		this.widgetEl.dataset.ishovered = 'false';
	}

	blur(): void {
		this.#actions.OnBlur();
	}

	focus(): void {
		this.#actions.OnFocus();
	}

	setQuillHtml(incomingHtml: string): void {
		const safeHtml = DOMPurify.sanitize(incomingHtml ?? '', {
			USE_PROFILES: { html: true },
		});

		const delta = this.quill?.clipboard.convert({ html: safeHtml });

		this.quill?.setContents(delta ?? [], 'silent');
	}
}
