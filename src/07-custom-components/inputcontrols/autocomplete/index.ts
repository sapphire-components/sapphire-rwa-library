import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';
import { createSpinner } from '@utils/loader';

interface IAutocompleteOption {
	Label: string;
	Value: string;
}

interface IAutocomplete extends BaseComponentInit {
	actions: {
		OnAdd: (value: string) => void;
		OnClear: () => void;
		OnEmit: (emitted: string) => void;
		OnScroll: (startIndex: number) => void;
		OnSearch: (keyword: string) => void;
		OnSelect: (selected: string) => void;
	};
	allowAdd: boolean;
	enabled: boolean;
	hasChips: boolean;
	hasEmitButton: boolean;
	isLoading: boolean;
	keyword: string;
	optionValues: IAutocompleteOption[];
	searchDebounce: number;
	searchPageSize: number;
	searchServerSide: boolean;
	searchStartIndex: number;
	searchTotalCount: number;
	selectedValues: IAutocompleteOption[];
	textAdd: string;
	textEmit: string;
	textNoRecords: string;
	textPrompt: string;
	theme: string;
}

export default class Autocomplete extends BaseComponent {
	private actions!: IAutocomplete['actions'];
	private allowAdd = false;
	private enabled = true;
	private hasChips = false;
	private hasEmitButton = false;
	private isLoading = false;
	private optionValues: IAutocompleteOption[] = [];
	private searchDebounce = 0;
	private searchPageSize = 0;
	private searchServerSide = false;
	private searchStartIndex = 0;
	private searchTotalCount = 0;
	// Start index the rows currently on screen belong to. searchStartIndex can
	// move first; the rows stay put until optionValues for that index arrive.
	private pageStartIndex = 0;
	private selectedValues: IAutocompleteOption[] = [];
	private textAdd = '';
	private textEmit = '';
	private textNoRecords = '';
	private textPrompt = '';
	private theme = '';

	// Keyword input: the search the current optionValues were built for.
	// Empty means nothing has been applied yet, so the list stays empty.
	private appliedKeyword = '';
	// Text the user has typed. Empty while a committed value is only displayed.
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
	private spacerTopEl!: HTMLLIElement;
	private spacerBottomEl!: HTMLLIElement;
	private skeletonBeforeEl!: HTMLLIElement;
	private skeletonAfterEl!: HTMLLIElement;
	private loadingEl!: HTMLDivElement;
	private addEl!: HTMLButtonElement;

	private tippyInstance: TippyInstance | null = null;
	private fieldResizeObserver?: ResizeObserver;
	private positionRafId: number | null = null;
	private lastFieldTop = 0;
	private lastFieldLeft = 0;
	private emitKeywordDebounced!: ((keyword: string) => void) & { cancel: () => void };
	private avgRowHeight = 0;
	private requestedStartIndex: number | null = null;
	private skeletonKey = '';
	private suppressScroll = false;
	private virtualLayoutQueued = false;
	private alignToRowsOnOpen = false;

	private readonly requestPageDebounced = Helpers.debounce((): void => {
		this.requestPageForScroll();
	}, 200);

	private readonly handleListScroll = (): void => {
		if (this.suppressScroll || !this.isVirtualized()) return;
		this.syncSkeletons();
		this.requestPageDebounced();
	};

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

	private readonly onInputOpen = (): void => {
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
		// so wiping it drops any applied keyword and, in server-side mode, emits OnSearch('').
		const previousText = this.isEditing || this.hasChips ? this.keyword : (this.selectedValues[0]?.Label ?? '');
		const becameEmpty = previousText.trim() !== '' && next.trim() === '';

		this.isEditing = true;
		this.keyword = next;
		if (next.trim() === '') this.appliedKeyword = '';
		this.clearActive();
		this.updateInputChrome();
		this.renderOptions();

		if (becameEmpty) {
			this.keepInputEmpty = true;
			this.emitKeywordNow('');
			return;
		}

		if (this.searchServerSide && next.trim() !== '') this.emitKeywordDebounced(next.trim());
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

	// Keeps focus in the input when pressing the clear control or an option.
	private readonly preventMouseDown = (event: MouseEvent): void => {
		event.preventDefault();
	};

	private readonly onClearClick = (event: MouseEvent): void => {
		event.preventDefault();
		this.clearTypedText();
	};

	private readonly onListClick = (event: MouseEvent): void => {
		const optionEl = (event.target as HTMLElement).closest<HTMLElement>('.autocomplete-option');
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
		this.actions.OnEmit(this.selectedJson());
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

	constructor(init: IAutocomplete) {
		super(init);

		if (!this.widgetEl) {
			console.warn('Autocomplete: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.allowAdd = init.allowAdd;
		this.enabled = init.enabled;
		this.hasChips = init.hasChips;
		this.hasEmitButton = init.hasEmitButton;
		this.isLoading = init.isLoading;
		this.optionValues = this.readOptions(init.optionValues);
		this.searchDebounce = this.readDelay(init.searchDebounce);
		this.searchPageSize = this.readCount(init.searchPageSize);
		this.searchServerSide = init.searchServerSide;
		this.searchStartIndex = this.readCount(init.searchStartIndex);
		this.searchTotalCount = this.readCount(init.searchTotalCount);
		this.pageStartIndex = this.searchStartIndex;
		this.appliedKeyword = init.keyword ?? '';
		this.selectedValues = this.readOptions(init.selectedValues);
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
		this.widgetEl.classList.add('autocomplete');

		this.chipsEl = document.createElement('div');
		this.chipsEl.className = 'autocomplete-chips';

		this.fieldEl = document.createElement('div');
		this.fieldEl.className = 'autocomplete-field';

		this.inputEl = document.createElement('input');
		this.inputEl.type = 'text';
		this.inputEl.className = 'autocomplete-input';
		this.inputEl.autocomplete = 'off';
		this.inputEl.spellcheck = false;
		this.inputEl.disabled = !this.enabled;
		this.inputEl.setAttribute('role', 'combobox');
		this.inputEl.setAttribute('aria-autocomplete', 'list');
		this.inputEl.setAttribute('aria-expanded', 'false');
		this.inputEl.setAttribute('aria-controls', this.listId);
		this.inputEl.placeholder = this.textPrompt;
		if (!this.hasChips && this.selectedValues[0]) this.inputEl.value = this.selectedValues[0].Label;

		this.clearEl = document.createElement('button');
		this.clearEl.type = 'button';
		this.clearEl.className = 'autocomplete-clear';
		this.clearEl.setAttribute('aria-label', 'Clear');
		this.clearEl.hidden = true;
		this.clearEl.innerHTML = Helpers.placeIcon('x', 's');

		this.fieldEl.append(this.inputEl, this.clearEl);

		this.emitEl = document.createElement('button');
		this.emitEl.type = 'button';
		this.emitEl.className = 'btn btn-primary autocomplete-emit';
		this.emitEl.hidden = !this.hasEmitButton;
		this.emitEl.disabled = !this.canEmit();
		this.emitEl.textContent = this.textEmit;

		this.controlsEl = document.createElement('div');
		this.controlsEl.className = 'autocomplete-controls';
		this.controlsEl.append(this.fieldEl, this.emitEl);
		this.widgetEl.append(this.chipsEl, this.controlsEl);

		this.panelEl = document.createElement('div');
		this.panelEl.className = 'autocomplete-panel';

		this.listEl = document.createElement('ul');
		this.listEl.className = 'autocomplete-list';
		this.listEl.id = this.listId;
		this.listEl.setAttribute('role', 'listbox');

		this.spacerTopEl = this.createSpacer();
		this.spacerBottomEl = this.createSpacer();
		this.skeletonBeforeEl = this.createSkeletonGroup();
		this.skeletonAfterEl = this.createSkeletonGroup();
		this.listEl.append(this.spacerTopEl, this.spacerBottomEl, this.skeletonBeforeEl, this.skeletonAfterEl);

		this.loadingEl = document.createElement('div');
		this.loadingEl.className = 'autocomplete-loading';
		this.loadingEl.hidden = true;
		this.loadingEl.appendChild(createSpinner());

		this.addEl = document.createElement('button');
		this.addEl.type = 'button';
		this.addEl.className = 'autocomplete-add';
		this.addEl.textContent = this.textAdd;
		this.addEl.hidden = !this.allowAdd;

		this.panelEl.append(this.listEl, this.loadingEl, this.addEl);
	}

	private bindEvents(): void {
		this.inputEl.addEventListener('pointerdown', this.onInputOpen);
		this.inputEl.addEventListener('focus', this.onInputFocus);
		this.inputEl.addEventListener('click', this.onInputOpen);
		this.inputEl.addEventListener('blur', this.onInputBlur);
		this.inputEl.addEventListener('input', this.onInput);
		this.inputEl.addEventListener('keydown', this.onInputKeyDown);
		this.clearEl.addEventListener('pointerdown', this.preventMouseDown);
		this.clearEl.addEventListener('mousedown', this.preventMouseDown);
		this.clearEl.addEventListener('click', this.onClearClick);
		this.listEl.addEventListener('mousedown', this.preventMouseDown);
		this.listEl.addEventListener('click', this.onListClick);
		this.listEl.addEventListener('scroll', this.handleListScroll, { passive: true });
		this.addEl.addEventListener('click', this.onAddClick);
		this.addEl.addEventListener('keydown', this.onAddKeyDown);
		this.emitEl.addEventListener('click', this.onEmitClick);
		this.panelEl.addEventListener('focusout', this.onPanelFocusOut);
		this.chipsEl.addEventListener('click', this.onChipsClick);
	}

	private bindKeywordEmitter(): void {
		this.emitKeywordDebounced?.cancel();
		this.emitKeywordDebounced = Helpers.debounce((keyword: string) => {
			if (!this.searchServerSide) return;
			this.actions.OnSearch(keyword);
		}, this.searchDebounce);
	}

	private initTippy(): void {
		if (typeof window.tippy !== 'function') {
			console.warn('Autocomplete: window.tippy is not available');
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
				this.alignToRowsOnOpen = true;
				this.scheduleVirtualLayout();
			},
			// Tippy hides on the same press that focuses the field, which leaves
			// isOpen stuck and later focuses do nothing. Keep it open while focused.
			onHide: () => {
				if (this.closing) return;
				if (this.focusInside()) return false;
			},
			onClickOutside: (_instance: TippyInstance, event: Event) => {
				const target = event.target as Node | null;
				if (target && this.widgetEl.contains(target)) return;
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
		return active === this.emitEl || this.fieldEl.contains(active) || this.panelEl.contains(active);
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
		if (!wasVisible) {
			this.clearSkeletons();
			this.renderOptions();
		}

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

		// Dismissing the panel is not a search. Cancel a pending OnSearch so it
		// does not fire after the overlay is gone.
		this.emitKeywordDebounced?.cancel();

		if (this.hasChips) return;

		// An explicit clear stays empty. Dismissing a search still restores the selection.
		if (this.keepInputEmpty) {
			this.keyword = this.inputEl.value;
			this.updateInputChrome();
			return;
		}

		// The written keyword is what the current server results belong to.
		// Leave it in the field so reopening shows the same term.
		if (this.searchServerSide && this.keyword.trim() !== '') {
			this.updateInputChrome();
			return;
		}

		this.keyword = '';
		this.isEditing = false;
		this.inputEl.value = this.selectedValues[0]?.Label ?? '';
		this.updateInputChrome();
	}

	private shouldSelectCommitted(): boolean {
		const label = this.selectedValues[0]?.Label ?? '';
		return !this.hasChips && !this.isEditing && this.keyword === '' && label !== '' && this.inputEl.value === label;
	}

	private clearTypedText(): void {
		if (!this.enabled) return;
		const hadText = this.inputEl.value.length > 0;
		this.keyword = '';
		this.appliedKeyword = '';
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
		const option = this.optionByValue(value);
		if (!option) return;

		const hadKeyword = this.keyword.trim() !== '';

		if (this.hasChips) {
			if (!this.isSelected(value)) {
				this.selectedValues = [...this.selectedValues, option];
			}
			this.emitSelected();
			this.keyword = '';
			this.appliedKeyword = '';
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
		this.selectedValues = [option];
		this.emitSelected();
		this.keyword = '';
		this.appliedKeyword = '';
		this.isEditing = false;
		this.inputEl.value = option.Label;
		this.updateInputChrome();
		if (hadKeyword) this.emitKeywordNow('');
		this.close();
	}

	private removeChip(value: string): void {
		if (!this.isSelected(value)) return;
		this.selectedValues = this.selectedValues.filter((option) => option.Value !== value);
		this.emitSelected();
		this.renderChips();
		this.renderOptions();
	}

	private isSelected(value: string): boolean {
		return this.selectedValues.some((option) => option.Value === value);
	}

	private optionByValue(value: string): IAutocompleteOption | undefined {
		return this.optionValues.find((option) => option.Value === value) ?? this.selectedValues.find((option) => option.Value === value);
	}

	// Selected list leaves as JSON so the caller can deserialize it back into the option structure.
	private selectedJson(): string {
		return JSON.stringify(this.selectedValues);
	}

	private emitSelected(): void {
		this.actions.OnSelect(this.selectedJson());
	}

	private addCurrent(): void {
		const text = this.keyword.trim();
		if (!text || !this.allowAdd || !this.enabled) return;

		this.actions.OnAdd(text);
		this.keyword = '';
		this.appliedKeyword = '';
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
		if (keyword.trim() === '') {
			this.appliedKeyword = '';
			this.requestedStartIndex = null;
			this.requestPageDebounced.cancel();
		}
		if (!this.searchServerSide) return;
		this.actions.OnSearch(keyword);
	}

	private canEmit(): boolean {
		return this.enabled && this.hasEmitButton && this.writtenValueInList() !== null;
	}

	// Typed text that is not a list label is dirty and must not be emitted.
	private writtenValueInList(): IAutocompleteOption | null {
		const written = this.inputEl?.value.trim().toLowerCase() ?? '';
		if (!written) return null;

		const entries = this.hasChips ? this.optionValues : [...this.optionValues, ...this.selectedValues];
		return entries.find((option) => option.Label.trim().toLowerCase() === written) ?? null;
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

		for (const option of this.selectedValues) {
			this.chipsEl.appendChild(this.createChip(option));
		}
	}

	private createChip(option: IAutocompleteOption): HTMLElement {
		const chipEl = document.createElement('div');
		chipEl.className = 'chip';
		chipEl.dataset.value = option.Value;
		chipEl.dataset.hasclear = 'true';
		chipEl.dataset.enabled = this.enabled ? 'true' : 'false';

		const contentEl = document.createElement('div');
		contentEl.className = 'chip-content';
		contentEl.textContent = option.Label;
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
		for (const child of [...this.listEl.children]) {
			if (this.isVirtualChrome(child)) continue;
			child.remove();
		}
		this.activeIndex = null;
		this.inputEl.removeAttribute('aria-activedescendant');

		const awaitingKeyword = this.searchServerSide && !this.hasAppliedKeyword();
		const virtualized = this.isVirtualized();
		const options = (this.isLoading && !virtualized) || awaitingKeyword ? [] : this.optionsForList();
		const highlight = this.searchServerSide ? this.appliedKeyword : this.keyword;

		for (const [index, option] of options.entries()) {
			const optionEl = document.createElement('li');
			optionEl.className = 'autocomplete-option';
			optionEl.id = `${this.runtimeId}-opt-${this.pageStartIndex + index}`;
			optionEl.dataset.value = option.Value;
			optionEl.dataset.active = 'false';
			optionEl.setAttribute('role', 'option');

			const label = document.createElement('span');
			label.className = 'autocomplete-option-label';
			this.appendHighlightedLabel(label, option.Label, highlight);
			optionEl.appendChild(label);
			this.spacerBottomEl.before(optionEl);
		}

		this.updatePanelVisibility(awaitingKeyword, !virtualized && options.length === 0);
		// Place the new page and its spacer in the same frame. A deferred layout
		// let the previous rows sit in the new window for one paint.
		this.applyVirtualLayout();
	}

	private updatePanelVisibility(awaitingKeyword: boolean, noResults: boolean): void {
		this.loadingEl.toggleAttribute('hidden', !this.isLoading || this.isVirtualized());

		if (this.isLoading && !this.isVirtualized()) {
			this.listEl.toggleAttribute('hidden', true);
			this.tippyInstance?.popperInstance?.update?.();
			return;
		}

		// Keep the message inside the list. Hiding the list and using a sibling
		// left an empty panel when there was nothing to select.
		if (awaitingKeyword || noResults) {
			const note = document.createElement('li');
			note.className = 'autocomplete-empty';
			note.setAttribute('role', 'presentation');
			note.textContent = awaitingKeyword ? this.textPrompt : this.textNoRecords;
			this.spacerBottomEl.before(note);
		}

		this.listEl.toggleAttribute('hidden', false);
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

	// Server-side optionValues are the result set for Keyword. An empty Keyword
	// means nothing has been written yet, so the list stays empty.
	private hasAppliedKeyword(): boolean {
		return this.appliedKeyword.trim() !== '';
	}

	private optionsForList(): IAutocompleteOption[] {
		// The server page is already the window for searchStartIndex. Filtering it
		// would shift the scroll math, so selected values stay in the page.
		if (this.isVirtualized()) return this.optionValues;

		const selected = new Set(this.selectedValues.map((option) => option.Value));
		let options = this.optionValues.filter((option) => !selected.has(option.Value));

		if (!this.searchServerSide) {
			const query = this.keyword.trim().toLowerCase();
			if (query) options = options.filter((option) => option.Label.toLowerCase().includes(query));
		}

		return options;
	}

	// Server-side results are one page. searchTotalCount sizes the scroll;
	// scrolling asks for the page that covers the viewport.
	private isVirtualized(): boolean {
		return this.searchServerSide && this.hasAppliedKeyword() && this.searchTotalCount > 0 && this.searchPageSize > 0;
	}

	private isVirtualChrome(el: Element): boolean {
		return el === this.spacerTopEl || el === this.spacerBottomEl || el === this.skeletonBeforeEl || el === this.skeletonAfterEl;
	}

	private createSpacer(): HTMLLIElement {
		const spacer = document.createElement('li');
		spacer.className = 'autocomplete-spacer';
		spacer.setAttribute('role', 'presentation');
		spacer.setAttribute('aria-hidden', 'true');
		return spacer;
	}

	private createSkeletonGroup(): HTMLLIElement {
		const group = document.createElement('li');
		group.className = 'autocomplete-skeletons';
		group.setAttribute('role', 'presentation');
		group.setAttribute('aria-hidden', 'true');
		group.hidden = true;
		return group;
	}

	private createSkeletonRow(): HTMLDivElement {
		const row = document.createElement('div');
		row.className = 'autocomplete-skeleton';
		row.appendChild(document.createElement('span'));
		return row;
	}

	private scheduleVirtualLayout(): void {
		if (this.virtualLayoutQueued) return;
		this.virtualLayoutQueued = true;
		requestAnimationFrame(() => {
			this.virtualLayoutQueued = false;
			if (!this.listEl) return;
			this.applyVirtualLayout();
		});
	}

	private applyVirtualLayout(): void {
		if (!this.spacerTopEl || !this.spacerBottomEl) return;

		if (!this.isVirtualized()) {
			this.spacerTopEl.style.height = '0px';
			this.spacerBottomEl.style.height = '0px';
			this.clearSkeletons();
			return;
		}

		this.captureAverage(this.optionEls());
		const avg = this.rowHeight();
		const total = this.searchTotalCount;
		const start = Math.min(this.pageStartIndex, total);
		const rendered = Math.min(this.optionEls().length, Math.max(0, total - start));
		const below = Math.max(0, total - start - rendered);
		const scrollTop = this.listEl.scrollTop;

		this.suppressScroll = true;
		this.spacerTopEl.style.height = `${start * avg}px`;
		this.spacerBottomEl.style.height = `${below * avg}px`;
		if (this.listEl.scrollTop !== scrollTop) this.listEl.scrollTop = scrollTop;
		this.suppressScroll = false;

		this.syncSkeletons();
		if (!this.alignToRowsOnOpen) return;
		this.alignToRowsOnOpen = false;
		this.scrollToLoadedRows();
	}

	private captureAverage(rows: HTMLElement[]): void {
		if (this.avgRowHeight > 0 || rows.length === 0) return;
		const next = this.measureStride(rows);
		if (next > 0) this.avgRowHeight = next;
	}

	private measureStride(rows: HTMLElement[]): number {
		const first = rows[0].getBoundingClientRect();
		if (first.height <= 0) return 0;
		if (rows.length === 1) return first.height;

		const last = rows[rows.length - 1].getBoundingClientRect();
		const span = last.top - first.top;
		if (span <= 0) return first.height;
		return span / (rows.length - 1);
	}

	private rowHeight(): number {
		return this.avgRowHeight > 0 ? this.avgRowHeight : 36;
	}

	private scrollToLoadedRows(): void {
		const rows = this.optionEls();
		if (!this.isVirtualized() || rows.length === 0) return;

		const target = Math.max(0, this.contentTop(rows[0]));
		this.suppressScroll = true;
		this.listEl.scrollTop = target;
		this.suppressScroll = false;
		this.skeletonKey = '';
		this.syncSkeletons();
	}

	private resetVirtualScroll(): void {
		this.requestedStartIndex = null;
		this.skeletonKey = '';
		if (!this.listEl) return;
		this.suppressScroll = true;
		this.listEl.scrollTop = 0;
		this.suppressScroll = false;
	}

	private requestPageForScroll(): void {
		if (!this.enabled || this.isLoading || !this.isVirtualized() || this.avgRowHeight <= 0) return;
		if (this.listEl.clientHeight <= 0) return;

		const avg = this.avgRowHeight;
		const total = this.searchTotalCount;
		const pageSize = this.searchPageSize;
		const loadedStart = this.pageStartIndex;
		const loadedEnd = loadedStart + this.optionEls().length;
		const firstVisible = Math.max(0, Math.floor(this.listEl.scrollTop / avg));
		const lastVisible = Math.ceil((this.listEl.scrollTop + this.listEl.clientHeight) / avg);

		if (loadedEnd > loadedStart && firstVisible >= loadedStart && lastVisible <= loadedEnd) return;

		const maxStart = Math.max(0, total - pageSize);
		const desired = Math.min(maxStart, firstVisible);
		if (desired === loadedStart || desired === this.requestedStartIndex) return;

		this.requestedStartIndex = desired;
		this.actions.OnScroll?.(desired);
	}

	private syncSkeletons(): void {
		if (!this.skeletonBeforeEl || !this.skeletonAfterEl) return;
		if (!this.isVirtualized()) {
			this.clearSkeletons();
			return;
		}

		const avg = this.rowHeight();
		const total = this.searchTotalCount;
		const rows = this.optionEls();
		const loadedStart = Math.min(this.pageStartIndex, total);
		const loadedEnd = Math.min(total, loadedStart + rows.length);
		const viewHeight = this.listEl.clientHeight || avg;
		const overscan = Math.max(1, Math.ceil(viewHeight / avg));
		const viewStart = Math.max(0, Math.floor(this.listEl.scrollTop / avg) - overscan);
		const viewEnd = Math.min(total, Math.ceil((this.listEl.scrollTop + viewHeight) / avg) + overscan);

		let beforeCount = Math.max(0, Math.min(viewEnd, loadedStart) - viewStart);
		const afterFrom = Math.max(viewStart, loadedEnd);
		let afterCount = Math.max(0, viewEnd - afterFrom);
		const edges = this.renderedEdges(rows);
		const gap = this.visibleGap(edges);

		if (gap.below > 8 && loadedEnd < total) {
			afterCount = Math.max(afterCount, Math.min(Math.ceil(gap.below / avg), total - loadedEnd));
		}
		if (gap.above > 8 && loadedStart > 0) {
			beforeCount = Math.max(beforeCount, Math.min(Math.ceil(gap.above / avg), loadedStart));
		}

		const beforeTop = edges && beforeCount > 0 ? edges.top - beforeCount * avg : viewStart * avg;
		const afterTop = edges && afterCount > 0 ? edges.bottom : afterFrom * avg;
		const key = `${Math.round(beforeTop)}:${beforeCount}:${Math.round(afterTop)}:${afterCount}:${Math.round(avg)}`;
		if (key === this.skeletonKey) return;
		this.skeletonKey = key;

		this.renderSkeletonGroup(this.skeletonBeforeEl, beforeTop, beforeCount, avg);
		this.renderSkeletonGroup(this.skeletonAfterEl, afterTop, afterCount, avg);
	}

	private visibleGap(edges: { top: number; bottom: number } | null): { above: number; below: number } {
		const viewTop = this.listEl.scrollTop;
		const viewBottom = this.listEl.scrollTop + this.listEl.clientHeight;
		if (!edges) return { above: 0, below: Math.max(0, viewBottom - viewTop) };
		return {
			above: Math.max(0, edges.top - viewTop),
			below: Math.max(0, viewBottom - edges.bottom),
		};
	}

	private renderedEdges(rows: HTMLElement[]): { top: number; bottom: number } | null {
		if (rows.length === 0) return null;
		const firstTop = this.contentTop(rows[0]);
		const last = rows[rows.length - 1];
		return { top: firstTop, bottom: this.contentTop(last) + last.getBoundingClientRect().height };
	}

	private contentTop(el: HTMLElement): number {
		const scroller = this.listEl.getBoundingClientRect();
		return el.getBoundingClientRect().top - scroller.top + this.listEl.scrollTop;
	}

	private renderSkeletonGroup(group: HTMLLIElement, top: number, count: number, avg: number): void {
		if (count <= 0 || avg <= 0) {
			group.replaceChildren();
			group.hidden = true;
			return;
		}

		group.hidden = false;
		group.style.top = `${top}px`;

		while (group.childElementCount < count) group.appendChild(this.createSkeletonRow());
		while (group.childElementCount > count) group.lastElementChild?.remove();

		const height = `${avg}px`;
		for (const child of group.children) {
			const row = child as HTMLElement;
			if (row.style.height !== height) row.style.height = height;
		}
	}

	private clearSkeletons(): void {
		this.skeletonKey = '';
		this.renderSkeletonGroup(this.skeletonBeforeEl, 0, 0, 0);
		this.renderSkeletonGroup(this.skeletonAfterEl, 0, 0, 0);
	}

	private optionEls(): HTMLElement[] {
		return Array.from(this.listEl.querySelectorAll<HTMLElement>('.autocomplete-option'));
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
		this.selectedValues = this.selectedValues.filter((option) => option.Value !== '');
		if (!this.hasChips && this.selectedValues.length > 1) {
			this.selectedValues = this.selectedValues.slice(0, 1);
		}
	}

	private readOptions(raw: IAutocompleteOption[] | null | undefined): IAutocompleteOption[] {
		if (!Array.isArray(raw)) return [];

		const options: IAutocompleteOption[] = [];
		for (const item of raw) {
			if (!item || typeof item !== 'object') continue;
			if (typeof item.Value !== 'string' || typeof item.Label !== 'string') continue;
			if (item.Value === '') continue;
			options.push({ Label: item.Label, Value: item.Value });
		}
		return options;
	}

	private readDelay(value: number): number {
		const delay = Number(value);
		return Number.isFinite(delay) && delay > 0 ? delay : 0;
	}

	private readCount(value: number | undefined): number {
		const parsed = Helpers.toNumber(value);
		if (parsed == null || !Number.isFinite(parsed) || parsed < 0) return 0;
		return Math.floor(parsed);
	}

	parametersChanged(payload: IAutocomplete): void {
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
				this.inputEl.value = this.selectedValues[0]?.Label ?? '';
			}
			needsRender = true;
		}

		if (payload.searchServerSide !== undefined && payload.searchServerSide !== this.searchServerSide) {
			this.searchServerSide = payload.searchServerSide;
			this.emitKeywordDebounced.cancel();
			needsRender = true;
		}

		if (payload.keyword !== undefined) {
			const nextKeyword = payload.keyword ?? '';
			if (nextKeyword !== this.appliedKeyword) {
				this.appliedKeyword = nextKeyword;
				this.resetVirtualScroll();
				needsRender = true;
			}
		}

		if (payload.searchPageSize !== undefined) {
			const nextPageSize = this.readCount(payload.searchPageSize);
			if (nextPageSize !== this.searchPageSize) {
				this.searchPageSize = nextPageSize;
				needsRender = true;
			}
		}

		if (payload.searchStartIndex !== undefined) this.searchStartIndex = this.readCount(payload.searchStartIndex);

		if (payload.searchTotalCount !== undefined) {
			const nextTotalCount = this.readCount(payload.searchTotalCount);
			if (nextTotalCount !== this.searchTotalCount) {
				this.searchTotalCount = nextTotalCount;
				needsRender = true;
			}
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
			if (!this.isVirtualized()) needsRender = true;
		}

		if (payload.optionValues !== undefined) {
			const nextOptions = this.readOptions(payload.optionValues);
			if (!Helpers.areTheyEqual(nextOptions, this.optionValues)) {
				this.optionValues = nextOptions;
				// Start index is already the requested page. Pin the new rows to it
				// only once they arrive, so the previous page never jumps into view.
				this.pageStartIndex = this.searchStartIndex;
				if (this.requestedStartIndex === this.pageStartIndex) this.requestedStartIndex = null;
				needsRender = true;
			}
		}

		if (payload.selectedValues !== undefined) {
			const nextSelected = this.readOptions(payload.selectedValues);
			if (!Helpers.areTheyEqual(nextSelected, this.selectedValues)) {
				this.selectedValues = nextSelected;
				this.normalizeSelected();
				if (!this.hasChips && !this.isEditing) {
					this.inputEl.value = this.selectedValues[0]?.Label ?? '';
				}
				needsRender = true;
			}
		}

		this.updateInputChrome();
		if (needsRender) {
			this.renderChips();
			this.renderOptions();
		}
		if (this.isVirtualized() && !this.isLoading) this.requestPageDebounced();
	}

	destroy(): void {
		super.destroy();

		if (this.selectFrame !== null) window.cancelAnimationFrame(this.selectFrame);
		this.cancelScheduledClose();
		this.emitKeywordDebounced?.cancel();
		this.requestPageDebounced.cancel();
		this.stopPositionWatch();
		this.fieldResizeObserver?.disconnect();

		this.inputEl?.removeEventListener('pointerdown', this.onInputOpen);
		this.inputEl?.removeEventListener('focus', this.onInputFocus);
		this.inputEl?.removeEventListener('click', this.onInputOpen);
		this.inputEl?.removeEventListener('blur', this.onInputBlur);
		this.inputEl?.removeEventListener('input', this.onInput);
		this.inputEl?.removeEventListener('keydown', this.onInputKeyDown);
		this.clearEl?.removeEventListener('pointerdown', this.preventMouseDown);
		this.clearEl?.removeEventListener('mousedown', this.preventMouseDown);
		this.clearEl?.removeEventListener('click', this.onClearClick);
		this.listEl?.removeEventListener('mousedown', this.preventMouseDown);
		this.listEl?.removeEventListener('click', this.onListClick);
		this.listEl?.removeEventListener('scroll', this.handleListScroll);
		this.addEl?.removeEventListener('click', this.onAddClick);
		this.addEl?.removeEventListener('keydown', this.onAddKeyDown);
		this.emitEl?.removeEventListener('click', this.onEmitClick);
		this.panelEl?.removeEventListener('focusout', this.onPanelFocusOut);
		this.chipsEl?.removeEventListener('click', this.onChipsClick);

		this.tippyInstance?.destroy();
		this.tippyInstance = null;
	}
}
