import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';
import { createSpinner } from '@utils/loader';

interface ISuggestion extends BaseComponentInit {
	actions: {
		OnAdd: (value: string) => void;
		OnClear: () => void;
		OnEmit: (value: string) => void;
		OnSearch: (keyword: string) => void;
		OnSelect: (value: string) => void;
	};
	allowAdd: boolean;
	enabled: boolean;
	hasChips: boolean;
	hasEmitButton: boolean;
	isLoading: boolean;
	optionValues: string;
	searchDebounce: number;
	searchServerSide: boolean;
	selectedValues: string;
	textAdd: string;
	textEmit: string;
	textNoRecords: string;
	textPrompt: string;
	theme: string;
}

export default class Suggestion extends BaseComponent {
	private actions!: ISuggestion['actions'];
	private allowAdd = false;
	private enabled = true;
	private hasChips = false;
	private hasEmitButton = false;
	private isLoading = false;
	private optionValues: string[] = [];
	private searchDebounce = 0;
	private searchServerSide = false;
	private selectedValues: string[] = [];
	private textAdd = '';
	private textEmit = '';
	private textNoRecords = '';
	private textPrompt = '';
	private theme = '';

	private keyword = '';
	private isEditing = false;
	private isOpen = false;
	private closing = false;
	private keepInputEmpty = false;
	private activeIndex: number | null = null;
	private listId = '';
	private selectFrame: number | null = null;
	private blurCloseTimer: number | null = null;

	private controlsEl!: HTMLDivElement;
	private fieldEl!: HTMLDivElement;
	private inputEl!: HTMLInputElement;
	private emitEl!: HTMLButtonElement;
	private clearEl!: HTMLButtonElement;
	private chipsEl!: HTMLDivElement;
	private panelEl!: HTMLDivElement;
	private listEl!: HTMLUListElement;
	private emptyEl!: HTMLDivElement;
	private loadingEl!: HTMLDivElement;
	private addEl!: HTMLButtonElement;

	private tippyInstance: TippyInstance | null = null;
	private fieldResizeObserver?: ResizeObserver;
	private positionRafId: number | null = null;
	private lastFieldTop = 0;
	private lastFieldLeft = 0;
	private emitKeywordDebounced!: ((keyword: string) => void) & { cancel: () => void };

	private readonly syncPanelWidth = (): void => {
		const popper = this.tippyInstance?.popper;
		if (!popper) return;
		const width = this.fieldEl.getBoundingClientRect().width;
		popper.style.setProperty('--trigger-width', `${width}px`);
		this.tippyInstance?.popperInstance?.update?.();
	};

	private readonly watchFieldPosition = (): void => {
		if (!this.isOpen) {
			this.positionRafId = null;
			return;
		}

		const rect = this.fieldEl.getBoundingClientRect();
		if (rect.top !== this.lastFieldTop || rect.left !== this.lastFieldLeft) {
			this.lastFieldTop = rect.top;
			this.lastFieldLeft = rect.left;
			this.tippyInstance?.popperInstance?.update?.();
		}

		this.positionRafId = window.requestAnimationFrame(this.watchFieldPosition);
	};

	private readonly onInputPointerDown = (): void => {
		if (!this.enabled) return;
		this.open();
	};

	private readonly onInputFocus = (): void => {
		if (!this.enabled) return;
		this.cancelScheduledClose();
		this.open();
		if (!this.shouldSelectCommitted()) return;

		// The click that focused the field places the caret after this handler.
		// Reselect on the next frame so the first key replaces the committed value.
		this.selectFrame = window.requestAnimationFrame(() => {
			this.selectFrame = null;
			if (this.shouldSelectCommitted()) this.inputEl.select();
		});
	};

	private readonly onInputClick = (): void => {
		if (!this.enabled) return;
		this.open();
	};

	private readonly onInputBlur = (event: FocusEvent): void => {
		const next = event.relatedTarget as Node | null;
		if (next && (this.panelEl.contains(next) || this.fieldEl.contains(next))) return;
		// Focus can bounce in the same turn as the opening click. Close only if it actually left.
		this.cancelScheduledClose();
		this.blurCloseTimer = window.setTimeout(() => {
			this.blurCloseTimer = null;
			if (this.focusInside()) return;
			this.close();
		}, 0);
	};

	private readonly onInput = (): void => {
		const next = this.inputEl.value;
		// Committed single-select text is shown in the field but is not `keyword`,
		// so a manual wipe of that text still has to emit an empty OnSearch.
		const previousText = this.isEditing || this.hasChips ? this.keyword : (this.selectedValues[0] ?? '');
		const becameEmpty = previousText.trim() !== '' && next.trim() === '';

		this.isEditing = true;
		this.keyword = next;
		this.clearActive();
		this.updateInputChrome();
		this.renderOptions();

		if (becameEmpty) {
			this.keepInputEmpty = true;
			this.emitKeywordNow('');
			return;
		}

		if (next.trim() !== '' && this.searchServerSide) this.emitKeywordDebounced(next);
	};

	private readonly onInputKeyDown = (event: KeyboardEvent): void => {
		if (!this.enabled) return;

		if (!this.isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
			event.preventDefault();
			this.open();
			return;
		}

		if (!this.isOpen) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this.moveActive(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.moveActive(-1);
				break;
			case 'Home':
				event.preventDefault();
				this.setActiveIndex(0);
				break;
			case 'End':
				event.preventDefault();
				this.setActiveIndex(this.optionEls().length - 1);
				break;
			case 'Enter':
				event.preventDefault();
				if (this.activeIndex !== null) {
					const value = this.optionEls()[this.activeIndex]?.dataset.value ?? '';
					if (value) this.selectValue(value);
				}
				break;
			case 'Escape':
			case 'Esc':
				event.preventDefault();
				this.close();
				break;
			case 'Tab':
				if (!event.shiftKey && this.allowAdd && !this.addEl.disabled) {
					event.preventDefault();
					this.addEl.focus();
				}
				break;
		}
	};

	private readonly onClearMouseDown = (event: MouseEvent): void => {
		event.preventDefault();
	};

	private readonly onClearClick = (event: MouseEvent): void => {
		event.preventDefault();
		this.clearTypedText();
	};

	private readonly onListMouseDown = (event: MouseEvent): void => {
		event.preventDefault();
	};

	private readonly onListClick = (event: MouseEvent): void => {
		const optionEl = (event.target as HTMLElement).closest<HTMLElement>('.suggestion-option');
		if (!optionEl) return;
		const value = optionEl.dataset.value ?? '';
		if (!value) return;
		this.selectValue(value);
	};

	private readonly onAddClick = (event: MouseEvent): void => {
		event.preventDefault();
		this.addCurrent();
	};

	private readonly onEmitClick = (event: MouseEvent): void => {
		event.preventDefault();
		if (!this.canEmit()) return;
		this.actions.OnEmit(JSON.stringify(this.selectedValues));
	};

	private readonly onAddKeyDown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape' || event.key === 'Esc') {
			event.preventDefault();
			this.close();
			this.inputEl.focus();
			return;
		}

		if (event.key === 'Tab' && event.shiftKey) {
			event.preventDefault();
			this.inputEl.focus();
		}
	};

	private readonly onPanelFocusOut = (event: FocusEvent): void => {
		const next = event.relatedTarget as Node | null;
		if (next && (this.panelEl.contains(next) || next === this.inputEl)) return;
		this.close();
	};

	private readonly onChipsClick = (event: MouseEvent): void => {
		const clearBtn = (event.target as HTMLElement).closest<HTMLButtonElement>('.chip-clear');
		if (!clearBtn || !this.enabled) return;
		event.preventDefault();
		event.stopPropagation();
		const value = clearBtn.closest<HTMLElement>('.chip')?.dataset.value ?? '';
		if (!value) return;
		this.removeChip(value);
	};

	constructor(init: ISuggestion) {
		super(init);

		if (!this.widgetEl) {
			console.warn('Suggestion: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.allowAdd = init.allowAdd;
		this.enabled = init.enabled;
		this.hasChips = init.hasChips;
		this.hasEmitButton = init.hasEmitButton;
		this.isLoading = init.isLoading;
		this.optionValues = this.parseStringList(init.optionValues);
		this.searchDebounce = this.readDelay(init.searchDebounce);
		this.searchServerSide = init.searchServerSide;
		this.selectedValues = this.parseStringList(init.selectedValues);
		this.textAdd = init.textAdd ?? '';
		this.textEmit = init.textEmit ?? '';
		this.textNoRecords = init.textNoRecords ?? '';
		this.textPrompt = init.textPrompt ?? '';
		this.theme = init.theme ?? '';
		this.normalizeSelected();
		this.listId = `${this.runtimeId}-listbox`;

		this.bindKeywordEmitter();
		this.reflectStateAttributes();
		this.buildDom();
		this.renderChips();
		this.renderOptions();
		this.updateInputChrome();
		this.initTippy();
		this.bindEvents();

		this.fieldResizeObserver = new ResizeObserver(() => {
			if (this.isOpen) this.syncPanelWidth();
		});
		this.fieldResizeObserver.observe(this.fieldEl);
	}

	private reflectStateAttributes(): void {
		this.widgetEl.dataset.allowadd = this.allowAdd ? 'true' : 'false';
		this.widgetEl.dataset.enabled = this.enabled ? 'true' : 'false';
		this.widgetEl.dataset.hasemitbutton = this.hasEmitButton ? 'true' : 'false';
		this.widgetEl.dataset.haschips = this.hasChips ? 'true' : 'false';
		if (this.theme) this.widgetEl.dataset.theme = this.theme;
	}

	private buildDom(): void {
		this.widgetEl.replaceChildren();
		this.widgetEl.classList.add('suggestion');

		this.chipsEl = document.createElement('div');
		this.chipsEl.className = 'suggestion-chips';

		this.fieldEl = document.createElement('div');
		this.fieldEl.className = 'suggestion-field';

		this.inputEl = document.createElement('input');
		this.inputEl.type = 'text';
		this.inputEl.className = 'suggestion-input';
		this.inputEl.autocomplete = 'off';
		this.inputEl.spellcheck = false;
		this.inputEl.disabled = !this.enabled;
		this.inputEl.setAttribute('role', 'combobox');
		this.inputEl.setAttribute('aria-autocomplete', 'list');
		this.inputEl.setAttribute('aria-expanded', 'false');
		this.inputEl.setAttribute('aria-controls', this.listId);
		this.inputEl.placeholder = this.textPrompt;
		if (!this.hasChips && this.selectedValues[0]) this.inputEl.value = this.selectedValues[0];

		this.clearEl = document.createElement('button');
		this.clearEl.type = 'button';
		this.clearEl.className = 'suggestion-clear';
		this.clearEl.setAttribute('aria-label', 'Clear');
		this.clearEl.hidden = true;
		this.clearEl.innerHTML = Helpers.placeIcon('x', 's');

		this.fieldEl.append(this.inputEl, this.clearEl);

		this.emitEl = document.createElement('button');
		this.emitEl.type = 'button';
		this.emitEl.className = 'btn btn-primary suggestion-emit';
		this.emitEl.hidden = !this.hasEmitButton;
		this.emitEl.disabled = !this.canEmit();
		this.emitEl.textContent = this.textEmit;

		this.controlsEl = document.createElement('div');
		this.controlsEl.className = 'suggestion-controls';
		this.controlsEl.append(this.fieldEl, this.emitEl);
		this.widgetEl.append(this.chipsEl, this.controlsEl);

		this.panelEl = document.createElement('div');
		this.panelEl.className = 'suggestion-panel';

		this.listEl = document.createElement('ul');
		this.listEl.className = 'suggestion-list';
		this.listEl.id = this.listId;
		this.listEl.setAttribute('role', 'listbox');

		this.emptyEl = document.createElement('div');
		this.emptyEl.className = 'suggestion-empty';
		this.emptyEl.hidden = true;

		this.loadingEl = document.createElement('div');
		this.loadingEl.className = 'suggestion-loading';
		this.loadingEl.hidden = true;
		this.loadingEl.appendChild(createSpinner());

		this.addEl = document.createElement('button');
		this.addEl.type = 'button';
		this.addEl.className = 'suggestion-add';
		this.addEl.textContent = this.textAdd;
		this.addEl.hidden = !this.allowAdd;

		this.panelEl.append(this.listEl, this.emptyEl, this.loadingEl, this.addEl);
	}

	private bindEvents(): void {
		this.inputEl.addEventListener('pointerdown', this.onInputPointerDown);
		this.inputEl.addEventListener('focus', this.onInputFocus);
		this.inputEl.addEventListener('click', this.onInputClick);
		this.inputEl.addEventListener('blur', this.onInputBlur);
		this.inputEl.addEventListener('input', this.onInput);
		this.inputEl.addEventListener('keydown', this.onInputKeyDown);
		this.clearEl.addEventListener('pointerdown', this.onClearMouseDown);
		this.clearEl.addEventListener('mousedown', this.onClearMouseDown);
		this.clearEl.addEventListener('click', this.onClearClick);
		this.listEl.addEventListener('mousedown', this.onListMouseDown);
		this.listEl.addEventListener('click', this.onListClick);
		this.addEl.addEventListener('click', this.onAddClick);
		this.addEl.addEventListener('keydown', this.onAddKeyDown);
		this.emitEl.addEventListener('click', this.onEmitClick);
		this.panelEl.addEventListener('focusout', this.onPanelFocusOut);
		this.chipsEl.addEventListener('click', this.onChipsClick);
	}

	private bindKeywordEmitter(): void {
		this.emitKeywordDebounced?.cancel();
		this.emitKeywordDebounced = Helpers.debounce((keyword: string) => {
			this.actions.OnSearch(keyword);
		}, this.searchDebounce);
	}

	private initTippy(): void {
		if (typeof window.tippy !== 'function') {
			console.warn('Suggestion: window.tippy is not available');
			return;
		}

		this.tippyInstance = window.tippy(this.fieldEl, {
			appendTo: () => document.body,
			arrow: false,
			content: this.panelEl,
			hideOnClick: false,
			interactive: true,
			maxWidth: 'none',
			offset: [0, 4],
			placement: 'bottom-start',
			trigger: 'manual',
			onShow: (instance: TippyInstance) => {
				const placement = window.SapphireRWALibrary?.State?.isRTL ? 'bottom-end' : 'bottom-start';
				instance.setProps({ placement });
				this.syncPanelWidth();
			},
			// Tippy hides on the same press that focuses the field, which leaves
			// isOpen stuck and later focuses do nothing. Keep it open while focused.
			onHide: () => {
				if (this.closing) return;
				if (this.focusInside()) return false;
			},
			onClickOutside: (instance: TippyInstance, event: Event) => {
				void instance;
				const target = event.target as Node | null;
				if (target && (this.fieldEl.contains(target) || this.widgetEl.contains(target))) return;
				this.close();
			},
		});
	}

	private startPositionWatch(): void {
		if (this.positionRafId !== null) return;
		const rect = this.fieldEl.getBoundingClientRect();
		this.lastFieldTop = rect.top;
		this.lastFieldLeft = rect.left;
		this.positionRafId = window.requestAnimationFrame(this.watchFieldPosition);
	}

	private stopPositionWatch(): void {
		if (this.positionRafId === null) return;
		window.cancelAnimationFrame(this.positionRafId);
		this.positionRafId = null;
	}

	private isTippyVisible(): boolean {
		const state = this.tippyInstance?.state;
		return !!state && (state.isVisible || state.isShown);
	}

	private focusInside(): boolean {
		const active = document.activeElement;
		if (!active) return false;
		return active === this.inputEl || active === this.clearEl || active === this.emitEl || this.fieldEl.contains(active) || this.panelEl.contains(active);
	}

	private cancelScheduledClose(): void {
		if (this.blurCloseTimer === null) return;
		window.clearTimeout(this.blurCloseTimer);
		this.blurCloseTimer = null;
	}

	private open(): void {
		if (!this.enabled) return;

		const wasVisible = this.isOpen && this.isTippyVisible();
		this.isOpen = true;
		this.inputEl.setAttribute('aria-expanded', 'true');

		// A committed single value sits in the field for display. It is not a search.
		if (!wasVisible && !this.hasChips && !this.isEditing) this.keyword = '';
		if (!wasVisible) this.renderOptions();

		this.tippyInstance?.show();
		this.startPositionWatch();
	}

	private close(): void {
		if (!this.isOpen && !this.isTippyVisible()) return;
		this.cancelScheduledClose();
		this.closing = true;
		this.isOpen = false;
		this.inputEl.setAttribute('aria-expanded', 'false');
		this.clearActive();
		this.stopPositionWatch();
		this.tippyInstance?.hide();
		this.closing = false;

		if (this.hasChips) return;

		// An explicit clear stays empty. Dismissing a search still restores the selection.
		if (this.keepInputEmpty) {
			this.keyword = this.inputEl.value;
			this.updateInputChrome();
			return;
		}

		const hadKeyword = this.keyword.trim() !== '';
		this.keyword = '';
		this.isEditing = false;
		this.inputEl.value = this.selectedValues[0] ?? '';
		this.updateInputChrome();
		if (hadKeyword) this.emitKeywordNow('');
	}

	private shouldSelectCommitted(): boolean {
		return !this.hasChips && !this.isEditing && this.keyword === '' && !!this.selectedValues[0] && this.inputEl.value === this.selectedValues[0];
	}

	private clearTypedText(): void {
		if (!this.enabled) return;
		const hadText = this.inputEl.value.length > 0;
		this.keyword = '';
		this.isEditing = true;
		this.keepInputEmpty = true;
		this.inputEl.value = '';
		this.clearActive();
		this.updateInputChrome();
		this.renderOptions();
		this.open();
		if (hadText) this.emitKeywordNow('');
		this.actions.OnClear();
		this.inputEl.focus();
	}

	private selectValue(value: string): void {
		const hadKeyword = this.keyword.trim() !== '';

		if (this.hasChips) {
			if (!this.selectedValues.includes(value)) {
				this.selectedValues = [...this.selectedValues, value];
			}
			this.actions.OnSelect(JSON.stringify(this.selectedValues));
			this.keyword = '';
			this.isEditing = true;
			this.inputEl.value = '';
			this.updateInputChrome();
			this.renderChips();
			this.renderOptions();
			if (hadKeyword) this.emitKeywordNow('');
			this.inputEl.focus();
			return;
		}

		this.keepInputEmpty = false;
		this.selectedValues = [value];
		this.actions.OnSelect(JSON.stringify(this.selectedValues));
		this.keyword = '';
		this.isEditing = false;
		this.inputEl.value = value;
		this.updateInputChrome();
		if (hadKeyword) this.emitKeywordNow('');
		this.close();
	}

	private removeChip(value: string): void {
		if (!this.selectedValues.includes(value)) return;
		this.selectedValues = this.selectedValues.filter((item) => item !== value);
		this.actions.OnSelect(JSON.stringify(this.selectedValues));
		this.renderChips();
		this.renderOptions();
	}

	private addCurrent(): void {
		const text = this.keyword.trim();
		if (!text || !this.allowAdd || !this.enabled) return;

		this.actions.OnAdd(text);
		this.keyword = '';
		this.isEditing = true;
		this.inputEl.value = '';
		this.clearActive();
		this.updateInputChrome();
		this.renderOptions();
		this.emitKeywordNow('');
		this.inputEl.focus();
	}

	private emitKeywordNow(keyword: string): void {
		this.emitKeywordDebounced?.cancel();
		this.actions.OnSearch(keyword);
	}

	private canEmit(): boolean {
		return this.enabled && this.hasEmitButton && this.writtenValueInList() !== null;
	}

	// Typed text that is not a list entry is dirty and must not be emitted.
	private writtenValueInList(): string | null {
		const written = this.inputEl?.value.trim().toLowerCase() ?? '';
		if (!written) return null;

		const entries = this.hasChips ? this.optionValues : [...this.optionValues, ...this.selectedValues];
		return entries.find((value) => value.trim().toLowerCase() === written) ?? null;
	}

	private updateInputChrome(): void {
		const typed = this.keyword.trim();
		this.clearEl.hidden = this.inputEl.value.length === 0;
		this.addEl.textContent = typed ? `${this.textAdd} ${typed}` : this.textAdd;
		this.addEl.disabled = !this.enabled || typed.length === 0;
		this.emitEl.hidden = !this.hasEmitButton;
		this.emitEl.textContent = this.textEmit;
		this.emitEl.disabled = !this.canEmit();
	}

	private renderChips(): void {
		this.chipsEl.replaceChildren();
		if (!this.hasChips) return;

		for (const value of this.selectedValues) {
			this.chipsEl.appendChild(this.createChip(value));
		}
	}

	private createChip(value: string): HTMLElement {
		const chipEl = document.createElement('div');
		chipEl.className = 'chip';
		chipEl.dataset.value = value;
		chipEl.dataset.hasclear = 'true';
		chipEl.dataset.enabled = this.enabled ? 'true' : 'false';

		const contentEl = document.createElement('div');
		contentEl.className = 'chip-content';
		contentEl.textContent = value;
		chipEl.appendChild(contentEl);

		const clearBtn = document.createElement('button');
		clearBtn.type = 'button';
		clearBtn.className = 'chip-clear';
		clearBtn.setAttribute('aria-label', 'Remove');
		clearBtn.disabled = !this.enabled;
		clearBtn.innerHTML = Helpers.placeIcon('x', 's');
		clearBtn.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		chipEl.appendChild(clearBtn);

		return chipEl;
	}

	private renderOptions(): void {
		this.listEl.replaceChildren();
		this.activeIndex = null;
		this.inputEl.removeAttribute('aria-activedescendant');

		const awaitingKeyword = this.searchServerSide && this.keyword.trim() === '';
		const options = this.isLoading || awaitingKeyword ? [] : this.optionsForList();

		for (const [index, value] of options.entries()) {
			const optionEl = document.createElement('li');
			optionEl.className = 'suggestion-option';
			optionEl.id = `${this.runtimeId}-opt-${index}`;
			optionEl.dataset.value = value;
			optionEl.dataset.active = 'false';
			optionEl.setAttribute('role', 'option');

			const label = document.createElement('span');
			label.className = 'suggestion-option-label';
			this.appendHighlightedLabel(label, value, this.keyword);
			optionEl.appendChild(label);
			this.listEl.appendChild(optionEl);
		}

		this.updatePanelVisibility(awaitingKeyword, options.length === 0);
	}

	private updatePanelVisibility(awaitingKeyword: boolean, noResults: boolean): void {
		this.loadingEl.toggleAttribute('hidden', !this.isLoading);

		if (this.isLoading) {
			this.listEl.toggleAttribute('hidden', true);
			this.emptyEl.toggleAttribute('hidden', true);
			this.tippyInstance?.popperInstance?.update?.();
			return;
		}

		// Keep the message inside the list. Hiding the list and using a sibling
		// left an empty panel when there was nothing to select.
		if (awaitingKeyword || noResults) {
			const note = document.createElement('li');
			note.className = 'suggestion-empty';
			note.setAttribute('role', 'presentation');
			note.textContent = awaitingKeyword ? this.textPrompt : this.textNoRecords;
			this.listEl.appendChild(note);
		}

		this.listEl.toggleAttribute('hidden', false);
		this.emptyEl.toggleAttribute('hidden', true);
		this.tippyInstance?.popperInstance?.update?.();
	}

	private appendHighlightedLabel(label: HTMLElement, value: string, keyword: string): void {
		const needle = keyword.trim();
		if (!needle) {
			label.textContent = value;
			return;
		}

		const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
		let last = 0;
		for (const match of value.matchAll(pattern)) {
			const index = match.index ?? 0;
			if (index > last) label.append(document.createTextNode(value.slice(last, index)));
			const mark = document.createElement('mark');
			mark.textContent = match[0];
			label.append(mark);
			last = index + match[0].length;
		}

		if (last === 0) {
			label.textContent = value;
			return;
		}

		if (last < value.length) label.append(document.createTextNode(value.slice(last)));
	}

	private optionsForList(): string[] {
		const selected = new Set(this.selectedValues);
		let options = this.optionValues.filter((value) => !selected.has(value));

		if (!this.searchServerSide) {
			const query = this.keyword.trim().toLowerCase();
			if (query) options = options.filter((value) => value.toLowerCase().includes(query));
		}

		return options;
	}

	private optionEls(): HTMLElement[] {
		return Array.from(this.listEl.querySelectorAll<HTMLElement>('.suggestion-option'));
	}

	private moveActive(direction: 1 | -1): void {
		const options = this.optionEls();
		if (options.length === 0) return;

		if (this.activeIndex === null) {
			this.setActiveIndex(direction === 1 ? 0 : options.length - 1);
			return;
		}

		let next = this.activeIndex + direction;
		if (next < 0) next = options.length - 1;
		if (next >= options.length) next = 0;
		this.setActiveIndex(next);
	}

	private setActiveIndex(index: number): void {
		const options = this.optionEls();
		if (index < 0 || index >= options.length) {
			this.clearActive();
			return;
		}

		this.activeIndex = index;
		for (const [optionIndex, optionEl] of options.entries()) {
			optionEl.dataset.active = optionIndex === index ? 'true' : 'false';
		}
		this.inputEl.setAttribute('aria-activedescendant', options[index].id);
		options[index].scrollIntoView({ block: 'nearest' });
	}

	private clearActive(): void {
		this.activeIndex = null;
		for (const optionEl of this.optionEls()) {
			optionEl.dataset.active = 'false';
		}
		this.inputEl.removeAttribute('aria-activedescendant');
	}

	private normalizeSelected(): void {
		this.selectedValues = this.selectedValues.filter((value) => value !== '');
		if (!this.hasChips && this.selectedValues.length > 1) {
			this.selectedValues = this.selectedValues.slice(0, 1);
		}
	}

	private parseStringList(raw: string | null | undefined): string[] {
		if (!raw) return [];

		try {
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((item): item is string => typeof item === 'string');
		} catch {
			return [];
		}
	}

	private readDelay(value: number): number {
		const delay = Number(value);
		return Number.isFinite(delay) && delay > 0 ? delay : 0;
	}

	parametersChanged(payload: ISuggestion): void {
		if (!this.widgetEl) return;

		let needsRender = false;

		if (payload.enabled !== undefined && payload.enabled !== this.enabled) {
			this.enabled = payload.enabled;
			this.widgetEl.dataset.enabled = this.enabled ? 'true' : 'false';
			this.inputEl.disabled = !this.enabled;
			if (!this.enabled) this.close();
			needsRender = true;
		}

		if (payload.allowAdd !== undefined && payload.allowAdd !== this.allowAdd) {
			this.allowAdd = payload.allowAdd;
			this.widgetEl.dataset.allowadd = this.allowAdd ? 'true' : 'false';
			this.addEl.hidden = !this.allowAdd;
		}

		if (payload.hasEmitButton !== undefined && payload.hasEmitButton !== this.hasEmitButton) {
			this.hasEmitButton = payload.hasEmitButton;
			this.widgetEl.dataset.hasemitbutton = this.hasEmitButton ? 'true' : 'false';
		}

		if (payload.textEmit !== undefined && payload.textEmit !== this.textEmit) {
			this.textEmit = payload.textEmit;
		}

		if (payload.hasChips !== undefined && payload.hasChips !== this.hasChips) {
			this.hasChips = payload.hasChips;
			this.widgetEl.dataset.haschips = this.hasChips ? 'true' : 'false';
			this.normalizeSelected();
			if (this.hasChips) {
				this.inputEl.value = this.keyword;
				this.isEditing = this.keyword.trim() !== '';
			} else if (!this.isEditing) {
				this.inputEl.value = this.selectedValues[0] ?? '';
			}
			needsRender = true;
		}

		if (payload.searchServerSide !== undefined && payload.searchServerSide !== this.searchServerSide) {
			this.searchServerSide = payload.searchServerSide;
			this.emitKeywordDebounced.cancel();
			needsRender = true;
		}

		if (payload.searchDebounce !== undefined && payload.searchDebounce !== this.searchDebounce) {
			this.searchDebounce = this.readDelay(payload.searchDebounce);
			this.bindKeywordEmitter();
		}

		if (payload.textAdd !== undefined && payload.textAdd !== this.textAdd) {
			this.textAdd = payload.textAdd;
		}

		if (payload.textPrompt !== undefined && payload.textPrompt !== this.textPrompt) {
			this.textPrompt = payload.textPrompt;
			this.inputEl.placeholder = this.textPrompt;
			needsRender = true;
		}

		if (payload.textNoRecords !== undefined && payload.textNoRecords !== this.textNoRecords) {
			this.textNoRecords = payload.textNoRecords;
			needsRender = true;
		}

		if (payload.theme !== undefined && payload.theme !== this.theme) {
			this.theme = payload.theme;
			if (this.theme) this.widgetEl.dataset.theme = this.theme;
			else delete this.widgetEl.dataset.theme;
		}

		if (payload.isLoading !== undefined && payload.isLoading !== this.isLoading) {
			this.isLoading = payload.isLoading;
			needsRender = true;
		}

		if (payload.optionValues !== undefined) {
			const nextOptions = this.parseStringList(payload.optionValues);
			if (!Helpers.areTheyEqual(nextOptions, this.optionValues)) {
				this.optionValues = nextOptions;
				needsRender = true;
			}
		}

		if (payload.selectedValues !== undefined) {
			const nextSelected = this.parseStringList(payload.selectedValues);
			if (!Helpers.areTheyEqual(nextSelected, this.selectedValues)) {
				this.selectedValues = nextSelected;
				this.normalizeSelected();
				if (!this.hasChips && !this.isEditing) {
					this.inputEl.value = this.selectedValues[0] ?? '';
				}
				needsRender = true;
			}
		}

		this.updateInputChrome();
		if (!needsRender) return;
		this.renderChips();
		this.renderOptions();
	}

	destroy(): void {
		super.destroy();

		if (this.selectFrame !== null) window.cancelAnimationFrame(this.selectFrame);
		this.cancelScheduledClose();
		this.emitKeywordDebounced?.cancel();
		this.stopPositionWatch();
		this.fieldResizeObserver?.disconnect();

		this.inputEl?.removeEventListener('pointerdown', this.onInputPointerDown);
		this.inputEl?.removeEventListener('focus', this.onInputFocus);
		this.inputEl?.removeEventListener('click', this.onInputClick);
		this.inputEl?.removeEventListener('blur', this.onInputBlur);
		this.inputEl?.removeEventListener('input', this.onInput);
		this.inputEl?.removeEventListener('keydown', this.onInputKeyDown);
		this.clearEl?.removeEventListener('pointerdown', this.onClearMouseDown);
		this.clearEl?.removeEventListener('mousedown', this.onClearMouseDown);
		this.clearEl?.removeEventListener('click', this.onClearClick);
		this.listEl?.removeEventListener('mousedown', this.onListMouseDown);
		this.listEl?.removeEventListener('click', this.onListClick);
		this.addEl?.removeEventListener('click', this.onAddClick);
		this.addEl?.removeEventListener('keydown', this.onAddKeyDown);
		this.emitEl?.removeEventListener('click', this.onEmitClick);
		this.panelEl?.removeEventListener('focusout', this.onPanelFocusOut);
		this.chipsEl?.removeEventListener('click', this.onChipsClick);

		this.tippyInstance?.destroy();
		this.tippyInstance = null;
	}
}
