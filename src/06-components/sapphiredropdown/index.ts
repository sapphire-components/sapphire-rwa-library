import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Helpers from '../../09-utils/helpers';
import { createSpinner } from '../../09-utils/loader';
import { ValidationMessage } from '../../09-utils/validation-message';
import { tmplOption, tmplPanel } from './templates';

interface ISapphireDropdownConfig {
	Clear: boolean;
	HasChips: boolean;
	HasSelectAll: boolean;
	Multiple: boolean;
	NoOptionsText: string;
	NoSearchResultsText: string;
	Placeholder: string;
	Search: boolean;
	SearchKeyword: string;
	SearchPlaceholder: string;
	SearchServerSide: boolean;
	SelectAllText: string;
	SelectedOptionsText: string;
	ShowDescription: boolean;
	ShowIcon: boolean;
}

interface ISapphireDropdownOption {
	Description: string;
	Icon: string;
	Label: string;
	Value: string;
}

interface ISapphireDropdownActions {
	OnChange: (selected: string) => void;
	OnClear: () => void;
	OnScrollEnded: () => void;
	OnSearch: (keyword: string) => void;
	OnSearchClear: () => void;
}

interface ISapphireDropdown extends BaseComponentInit {
	actions: ISapphireDropdownActions;
	config: ISapphireDropdownConfig;
	enabled: boolean;
	isSearching: boolean;
	isValid: boolean;
	optionsList: ISapphireDropdownOption[];
	selectedList: ISapphireDropdownOption[];
	theme: string;
	validationMessage: string;
	width: string;
}

const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape', 'Esc', 'Tab', ' ', 'Spacebar']);

export default class SapphireDropdown extends BaseComponent {
	private actions!: ISapphireDropdownActions;
	private config!: ISapphireDropdownConfig;
	private enabled = true;
	private hasChips = false;
	private isValid = true;
	private isSearching = false;
	private noOptionsText = '';
	private noSearchResultsText = '';
	private optionsList: ISapphireDropdownOption[] = [];
	private placeholder = '';
	private searchKeyword = '';
	private searchPlaceholder = '';
	private selectAllText = '';
	private selectedList: ISapphireDropdownOption[] = [];
	private selectedOptionsText = '';
	private theme = '';
	private validationMessage = '';

	private triggerEl!: HTMLDivElement;
	private valueEl!: HTMLElement;
	private clearEl: HTMLElement | null = null;
	private panelEl!: HTMLElement;
	private searchEl: HTMLInputElement | null = null;
	private searchClearEl: HTMLElement | null = null;
	private listEl!: HTMLUListElement;
	private selectAllEl: HTMLElement | null = null;
	private emptyEl!: HTMLElement;
	private loadingEl!: HTMLElement;
	private chipsContainerEl: HTMLElement | null = null;
	private validationMessageCtrl!: ValidationMessage;

	private scrollEndEmitted = false;
	private tippyInstance: TippyInstance | null = null;
	private triggerResizeObserver?: ResizeObserver;
	private isOpen = false;
	private activeValue: string | null = null;
	private optionsListFocused = false;
	private typeahead = '';
	private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
	private emitSearchDebounced!: ((keyword: string) => void) & { cancel: () => void };
	private positionRafId: number | null = null;
	private lastTriggerTop = 0;
	private lastTriggerLeft = 0;

	private readonly syncPanelWidth = (): void => {
		const popper = this.tippyInstance?.popper;
		if (!popper) return;
		const width = this.triggerEl.getBoundingClientRect().width;
		popper.style.setProperty('--trigger-width', `${width}px`);
		this.tippyInstance?.popperInstance?.update?.();
	};

	// Popper repositions on scroll/resize but not on arbitrary layout shifts that
	// move the trigger (e.g. content above it growing). While open, poll the
	// trigger's viewport position and reposition the popper when it changes.
	private readonly watchTriggerPosition = (): void => {
		if (!this.isOpen) {
			this.positionRafId = null;
			return;
		}

		const rect = this.triggerEl.getBoundingClientRect();
		if (rect.top !== this.lastTriggerTop || rect.left !== this.lastTriggerLeft) {
			this.lastTriggerTop = rect.top;
			this.lastTriggerLeft = rect.left;
			this.tippyInstance?.popperInstance?.update?.();
		}

		this.positionRafId = window.requestAnimationFrame(this.watchTriggerPosition);
	};

	private startPositionWatch(): void {
		if (this.positionRafId !== null) return;
		const rect = this.triggerEl.getBoundingClientRect();
		this.lastTriggerTop = rect.top;
		this.lastTriggerLeft = rect.left;
		this.positionRafId = window.requestAnimationFrame(this.watchTriggerPosition);
	}

	private stopPositionWatch(): void {
		if (this.positionRafId === null) return;
		window.cancelAnimationFrame(this.positionRafId);
		this.positionRafId = null;
	}

	private listId = '';
	private optionId(value: string): string {
		return `${this.runtimeId}-opt-${value}`;
	}

	private readonly onTriggerClick = (event: MouseEvent): void => {
		event.preventDefault();
		if (!this.enabled) return;
		this.toggle();
	};

	private readonly onTriggerKeyDown = (event: KeyboardEvent): void => {
		if (!this.enabled) return;

		if (!this.isOpen) {
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
				event.preventDefault();
				this.open();
				return;
			}
			// Type-ahead opening for the select-only pattern.
			if (!this.config.Search && this.isPrintableKey(event)) {
				this.open();
				this.handleTypeahead(event.key);
			}
			return;
		}

		this.handleOpenKeyDown(event, false);
	};

	private readonly onSearchInput = (): void => {
		this.optionsListFocused = false;
		this.clearActive();
		this.searchKeyword = this.searchEl?.value ?? '';
		this.updateSearchClearVisibility();
		this.applySearch();
		// Emit regardless of mode; the implementation decides whether to use it.
		this.emitSearchDebounced(this.searchKeyword);
	};

	private readonly onSearchKeyDown = (event: KeyboardEvent): void => {
		this.handleOpenKeyDown(event, true);
	};

	private readonly onSearchClearClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		this.clearSearch();
	};

	private readonly onSearchClearKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		event.stopPropagation();
		this.clearSearch();
	};

	private readonly onListMouseDown = (event: MouseEvent): void => {
		// Prevent the trigger/search from losing focus when clicking an option.
		event.preventDefault();
	};

	private readonly onListScroll = (): void => {
		const el = this.listEl;
		const reachedEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
		if (reachedEnd && !this.scrollEndEmitted) {
			this.scrollEndEmitted = true;
			this.actions.OnScrollEnded();
		} else if (!reachedEnd && this.scrollEndEmitted) {
			this.scrollEndEmitted = false;
		}
	};

	private readonly onListClick = (event: MouseEvent): void => {
		if ((event.target as HTMLElement).closest('.sapphiredropdown-selectall')) {
			this.toggleSelectAll();
			return;
		}
		const optionEl = (event.target as HTMLElement).closest<HTMLElement>('.sapphiredropdown-option');
		if (!optionEl || optionEl.getAttribute('aria-disabled') === 'true') return;
		const value = optionEl.dataset.value ?? '';
		this.selectValue(value);
	};

	private readonly onClearClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		if (!this.enabled) return;
		this.clearSelection();
	};

	private readonly onClearKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		event.stopPropagation();
		if (!this.enabled) return;
		this.clearSelection();
	};

	private readonly onChipClearClick = (event: MouseEvent): void => {
		const clearBtn = (event.target as HTMLElement).closest<HTMLButtonElement>('.chip-clear');
		if (!clearBtn) return;
		event.preventDefault();
		event.stopPropagation();
		if (!this.enabled) return;
		const chipEl = clearBtn.closest<HTMLElement>('.chip');
		const value = chipEl?.dataset.value ?? '';
		if (!value) return;
		this.removeChipValue(value);
	};

	private readonly onChipClearKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		const clearBtn = (event.target as HTMLElement).closest<HTMLButtonElement>('.chip-clear');
		if (!clearBtn) return;
		event.preventDefault();
		event.stopPropagation();
		if (!this.enabled) return;
		const chipEl = clearBtn.closest<HTMLElement>('.chip');
		const value = chipEl?.dataset.value ?? '';
		if (!value) return;
		this.removeChipValue(value);
	};

	constructor(init: ISapphireDropdown) {
		super(init);

		if (!this.widgetEl) {
			console.warn('SapphireDropdown: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.config = init.config;
		this.enabled = init.enabled;
		this.isValid = init.isValid;
		this.isSearching = init.isSearching;
		this.optionsList = init.optionsList ?? [];
		this.selectedList = init.selectedList ?? [];
		this.normalizeSelectedList();
		this.hydrateSelectedList();
		this.placeholder = this.config.Placeholder ?? '';
		this.searchPlaceholder = this.config.SearchPlaceholder ?? '';
		this.searchKeyword = this.config.SearchKeyword ?? '';
		this.theme = init.theme ?? '';
		this.noOptionsText = this.config.NoOptionsText ?? '';
		this.noSearchResultsText = this.config.NoSearchResultsText ?? '';
		this.selectedOptionsText = this.config.SelectedOptionsText ?? '';
		this.selectAllText = this.config.SelectAllText ?? '';
		this.hasChips = this.config.HasChips;
		this.validationMessage = init.validationMessage ?? '';

		this.emitSearchDebounced = Helpers.debounce((keyword: string) => this.actions.OnSearch(keyword), 300);

		this.listId = `${this.runtimeId}-listbox`;

		this.reflectStateAttributes();
		this.buildDom();
		this.validationMessageCtrl = new ValidationMessage(this.triggerEl);
		this.renderOptions();
		this.updateTriggerLabel();
		this.validationMessageCtrl.update(this.isValid, this.validationMessage);
		this.updateLoadingState();
		this.initTippy();
		this.bindEvents();

		// Keep the panel width matched to the trigger when it resizes while open,
		// and re-evaluate the multiple-select summary against the new width.
		this.triggerResizeObserver = new ResizeObserver(() => {
			if (this.isOpen) this.syncPanelWidth();
			if (this.config.Multiple && this.selectedList.length > 0) this.renderTriggerValue();
		});
		this.triggerResizeObserver.observe(this.triggerEl);
	}

	private reflectStateAttributes(): void {
		this.widgetEl.dataset.clear = this.config.Clear ? 'true' : 'false';
		this.widgetEl.dataset.haschips = this.hasChips ? 'true' : 'false';
		this.widgetEl.dataset.multiple = this.config.Multiple ? 'true' : 'false';
		this.widgetEl.dataset.search = this.config.Search ? 'true' : 'false';
		this.widgetEl.dataset.enabled = this.enabled ? 'true' : 'false';
		this.widgetEl.dataset.isvalid = this.isValid ? 'true' : 'false';
		if (this.theme) {
			this.widgetEl.dataset.theme = this.theme;
		}
	}

	private buildDom(): void {
		this.widgetEl.replaceChildren();

		// Trigger (select-only combobox)
		this.triggerEl = document.createElement('div');
		this.triggerEl.className = 'sapphiredropdown-trigger';
		this.triggerEl.id = `${this.runtimeId}-trigger`;
		this.triggerEl.setAttribute('role', 'combobox');
		this.triggerEl.setAttribute('aria-haspopup', 'listbox');
		this.triggerEl.setAttribute('aria-expanded', 'false');
		this.triggerEl.setAttribute('aria-controls', this.listId);
		this.triggerEl.tabIndex = this.enabled ? 0 : -1;

		this.valueEl = document.createElement('span');
		this.valueEl.className = 'sapphiredropdown-value';
		this.triggerEl.appendChild(this.valueEl);

		if (this.config.Clear) {
			this.clearEl = document.createElement('span');
			this.clearEl.className = 'sapphiredropdown-clear';
			this.clearEl.setAttribute('role', 'button');
			this.clearEl.setAttribute('aria-label', 'Clear selection');
			this.clearEl.tabIndex = 0;
			this.clearEl.innerHTML = Helpers.placeIcon('x', 's');
			this.triggerEl.appendChild(this.clearEl);
		}

		const chevron = document.createElement('span');
		chevron.className = 'sapphiredropdown-chevron';
		chevron.setAttribute('aria-hidden', 'true');
		chevron.innerHTML = Helpers.placeIcon('caret-down', 's');
		this.triggerEl.appendChild(chevron);

		this.widgetEl.appendChild(this.triggerEl);

		if (this.hasChips) {
			this.chipsContainerEl = document.createElement('div');
			this.chipsContainerEl.className = 'sapphiredropdown-chips';
			this.widgetEl.appendChild(this.chipsContainerEl);
		}

		// Panel (tippy content) — rendered inside the popper (appended to body),
		// so it carries its own flags for styling instead of relying on the wrapper.
		const panelFragment = tmplPanel.content.cloneNode(true);
		this.panelEl = (panelFragment as DocumentFragment).querySelector('.sapphiredropdown-panel') as HTMLElement;
		this.panelEl.dataset.multiple = this.config.Multiple ? 'true' : 'false';

		const searchWrap = this.panelEl.querySelector('.sapphiredropdown-search') as HTMLElement;

		if (this.config.Search) {
			const searchIcon = searchWrap.querySelector('.sapphiredropdown-search-icon') as HTMLElement;
			searchIcon.innerHTML = Helpers.placeIcon('magnifying-glass', 's');

			this.searchEl = searchWrap.querySelector('.sapphiredropdown-search-input') as HTMLInputElement;
			this.searchEl.placeholder = this.searchPlaceholder;
			this.searchEl.value = this.searchKeyword;
			this.searchEl.setAttribute('aria-controls', this.listId);

			this.searchClearEl = searchWrap.querySelector('.sapphiredropdown-search-clear') as HTMLElement;
			this.searchClearEl.innerHTML = Helpers.placeIcon('x', 's');

			this.updateSearchClearVisibility();
		} else {
			searchWrap.remove();
			this.searchEl = null;
			this.searchClearEl = null;
		}

		this.listEl = this.panelEl.querySelector('.sapphiredropdown-list') as HTMLUListElement;
		this.listEl.id = this.listId;

		this.emptyEl = this.panelEl.querySelector('.sapphiredropdown-empty') as HTMLElement;
		this.loadingEl = this.panelEl.querySelector('.sapphiredropdown-loading') as HTMLElement;
		this.loadingEl.appendChild(createSpinner());
	}

	private renderOptions(): void {
		this.listEl.replaceChildren();
		this.selectAllEl = null;

		if (this.config.Multiple && this.config.HasSelectAll) {
			this.renderSelectAllRow();
		}

		for (const option of this.optionsList) {
			const optionFragment = tmplOption.content.cloneNode(true);
			const optionEl = (optionFragment as DocumentFragment).querySelector('.sapphiredropdown-option') as HTMLLIElement;

			optionEl.id = this.optionId(option.Value);
			optionEl.dataset.value = option.Value;
			optionEl.setAttribute('aria-selected', this.isSelected(option.Value) ? 'true' : 'false');

			const checkbox = optionEl.querySelector('.sapphiredropdown-option-checkbox') as HTMLElement;
			if (this.config.Multiple) {
				checkbox.innerHTML = Helpers.placeIcon('check', 's');
			} else {
				checkbox.remove();
			}

			const icon = optionEl.querySelector('.sapphiredropdown-option-icon') as HTMLElement;
			if (this.config.ShowIcon && option.Icon) {
				icon.innerHTML = Helpers.placeIcon(option.Icon, 's');
			} else {
				icon.remove();
			}

			const label = optionEl.querySelector('.sapphiredropdown-option-label') as HTMLElement;
			label.textContent = option.Label;

			const description = optionEl.querySelector('.sapphiredropdown-option-description') as HTMLElement;
			if (this.config.ShowDescription && option.Description) {
				description.textContent = option.Description;
			} else {
				description.remove();
			}

			this.listEl.appendChild(optionEl);
		}

		this.activeValue = null;
		this.scrollEndEmitted = false;
		this.updateActiveDescendant();
		this.updateSelectAllState();
		// Client-side: re-apply the active keyword to the freshly rendered list.
		if (!this.config.SearchServerSide && this.searchKeyword.trim().length > 0) {
			this.filterOptions(this.searchKeyword);
		} else {
			this.updateEmptyState();
		}
	}

	// Pinned row at the top of the list (Multiple + HasSelectAll) that toggles
	// every option on/off. Kept off the .sapphiredropdown-option class so it is
	// excluded from search filtering and keyboard navigation.
	private renderSelectAllRow(): void {
		const rowEl = document.createElement('li');
		rowEl.className = 'sapphiredropdown-selectall';
		rowEl.setAttribute('role', 'option');
		rowEl.setAttribute('aria-selected', 'false');

		const checkbox = document.createElement('span');
		checkbox.className = 'sapphiredropdown-option-checkbox';
		checkbox.setAttribute('aria-hidden', 'true');
		checkbox.innerHTML = Helpers.placeIcon('check', 's');
		rowEl.appendChild(checkbox);

		const label = document.createElement('span');
		label.className = 'sapphiredropdown-option-label';
		label.textContent = this.selectAllText;
		rowEl.appendChild(label);

		this.listEl.appendChild(rowEl);
		this.selectAllEl = rowEl;
	}

	private toggleSelectAll(): void {
		const allSelected = this.optionsList.length > 0 && this.optionsList.every((option) => this.isSelected(option.Value));
		this.selectedList = allSelected ? [] : [...this.optionsList];
		this.refreshSelectedState();
		this.updateTriggerLabel();
		this.emitChange();
	}

	// Reflect the aggregate selection: fully checked when every option is
	// selected, indeterminate when only some are.
	private updateSelectAllState(): void {
		if (!this.selectAllEl) return;
		const total = this.optionsList.length;
		const selectedCount = this.optionsList.reduce((count, option) => count + (this.isSelected(option.Value) ? 1 : 0), 0);
		const allSelected = total > 0 && selectedCount === total;
		this.selectAllEl.setAttribute('aria-selected', allSelected ? 'true' : 'false');
		this.selectAllEl.dataset.indeterminate = selectedCount > 0 && !allSelected ? 'true' : 'false';
	}

	// While searching, hide the list/empty message and show the loading spinner;
	// parametersChanged flips isSearching back off to reveal the options.
	private updateLoadingState(): void {
		this.loadingEl.hidden = !this.isSearching;
		if (this.isSearching) {
			this.listEl.hidden = true;
			this.emptyEl.hidden = true;
		} else {
			this.listEl.hidden = false;
			this.updateEmptyState();
		}
		this.tippyInstance?.popperInstance?.update?.();
	}

	// Client-side mode filters the existing options locally; server-side mode
	// relies on the parent updating optionsList from the emitted keyword.
	private applySearch(): void {
		if (this.config.SearchServerSide) {
			this.updateEmptyState();
		} else {
			this.filterOptions(this.searchKeyword);
		}
	}

	private filterOptions(query: string): void {
		const normalized = query.trim().toLowerCase();

		for (const optionEl of this.optionEls()) {
			const option = this.optionByValue(optionEl.dataset.value ?? '');
			const matches =
				normalized === '' ||
				(option?.Label?.toLowerCase().includes(normalized) ?? false) ||
				(option?.Description?.toLowerCase().includes(normalized) ?? false);
			optionEl.hidden = !matches;
		}

		this.updateEmptyState();

		// Keep the active option valid after filtering, but only while navigating the list.
		if (this.optionsListFocused) {
			if (this.activeValue === null || !this.isValueVisible(this.activeValue)) {
				this.setActiveValue(this.firstNavigableValue());
			}
		} else {
			this.clearActive();
		}

		this.tippyInstance?.popperInstance?.update?.();
	}

	// Emptiness depends on the mode: client-side counts visible (non-hidden)
	// options, server-side counts the incoming list. NoSearchResultsText shows
	// while a keyword is active, NoOptionsText otherwise.
	private updateEmptyState(): void {
		const hasVisible = this.config.SearchServerSide ? this.optionsList.length > 0 : this.optionEls().some((optionEl) => !optionEl.hidden);

		if (hasVisible) {
			this.emptyEl.hidden = true;
			return;
		}

		const searching = this.config.Search && this.searchKeyword.trim().length > 0;
		this.emptyEl.textContent = searching ? this.noSearchResultsText : this.noOptionsText;
		this.emptyEl.hidden = false;
	}

	private initTippy(): void {
		if (typeof window.tippy !== 'function') {
			console.warn('SapphireDropdown: window.tippy is not available');
			return;
		}

		this.tippyInstance = window.tippy(this.triggerEl, {
			appendTo: () => document.body,
			arrow: false,
			content: this.panelEl,
			interactive: true,
			maxWidth: 'none',
			offset: [0, 4],
			placement: 'bottom-start',
			trigger: 'manual',
			onShow: (instance: TippyInstance) => {
				let placement = 'bottom-start';
				if (window.SapphireRWALibrary?.State?.isRTL) {
					placement = 'bottom-end';
				}
				instance.setProps({ placement });

				this.syncPanelWidth();
			},
			onClickOutside: () => {
				this.close();
			},
		});
	}

	private bindEvents(): void {
		this.triggerEl.addEventListener('click', this.onTriggerClick);
		this.triggerEl.addEventListener('keydown', this.onTriggerKeyDown);
		this.listEl.addEventListener('mousedown', this.onListMouseDown);
		this.listEl.addEventListener('click', this.onListClick);
		this.listEl.addEventListener('scroll', this.onListScroll);
		this.searchEl?.addEventListener('input', this.onSearchInput);
		this.searchEl?.addEventListener('keydown', this.onSearchKeyDown);
		this.searchClearEl?.addEventListener('click', this.onSearchClearClick);
		this.searchClearEl?.addEventListener('keydown', this.onSearchClearKeyDown);
		this.clearEl?.addEventListener('click', this.onClearClick);
		this.clearEl?.addEventListener('keydown', this.onClearKeyDown);
		this.chipsContainerEl?.addEventListener('click', this.onChipClearClick);
		this.chipsContainerEl?.addEventListener('keydown', this.onChipClearKeyDown);
	}

	private toggle(): void {
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	}

	private open(): void {
		if (this.isOpen || !this.enabled) return;
		this.isOpen = true;
		this.triggerEl.setAttribute('aria-expanded', 'true');
		this.tippyInstance?.show();
		this.startPositionWatch();

		if (this.searchEl) {
			this.optionsListFocused = false;
			this.clearActive();
			this.searchEl.value = this.searchKeyword;
			this.updateSearchClearVisibility();
			if (!this.config.SearchServerSide) this.filterOptions(this.searchKeyword);
			window.requestAnimationFrame(() => this.searchEl?.focus());
		} else {
			const selectedValue = this.selectedList[0]?.Value ?? null;
			this.setActiveValue(selectedValue ?? this.firstNavigableValue());
		}
	}

	private close(): void {
		if (!this.isOpen) return;
		this.isOpen = false;
		this.optionsListFocused = false;
		this.triggerEl.setAttribute('aria-expanded', 'false');
		this.stopPositionWatch();
		this.tippyInstance?.hide();
		this.clearActive();
	}

	private handleOpenKeyDown(event: KeyboardEvent, fromSearch: boolean): void {
		if (!NAV_KEYS.has(event.key)) return;

		switch (event.key) {
			case 'ArrowDown':
				if (fromSearch && !this.optionsListFocused) {
					event.preventDefault();
					this.optionsListFocused = true;
					this.setActiveValue(this.firstNavigableValue());
					break;
				}
				event.preventDefault();
				this.moveActive(1);
				break;
			case 'ArrowUp':
				if (fromSearch && !this.optionsListFocused) return;
				event.preventDefault();
				this.moveActive(-1);
				break;
			case 'Home':
				if (fromSearch && !this.optionsListFocused) return;
				event.preventDefault();
				this.setActiveValue(this.firstNavigableValue());
				break;
			case 'End':
				if (fromSearch && !this.optionsListFocused) return;
				event.preventDefault();
				this.setActiveValue(this.lastNavigableValue());
				break;
			case 'Enter':
				if (fromSearch && !this.optionsListFocused) {
					event.preventDefault();
					break;
				}
				event.preventDefault();
				if (this.activeValue !== null) {
					this.selectValue(this.activeValue);
				}
				break;
			case ' ':
			case 'Spacebar':
				// Space selects only in the select-only pattern; in search it types.
				if (!fromSearch) {
					event.preventDefault();
					if (this.activeValue !== null) {
						this.selectValue(this.activeValue);
					}
				}
				break;
			case 'Escape':
			case 'Esc':
				event.preventDefault();
				this.close();
				this.triggerEl.focus();
				break;
			case 'Tab':
				this.close();
				break;
		}
	}

	private isPrintableKey(event: KeyboardEvent): boolean {
		return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
	}

	private handleTypeahead(char: string): void {
		clearTimeout(this.typeaheadTimer);
		this.typeahead += char.toLowerCase();
		this.typeaheadTimer = setTimeout(() => {
			this.typeahead = '';
		}, 500);

		const match = this.navigableOptions().find((option) => option.Label?.toLowerCase().startsWith(this.typeahead));
		if (match) {
			this.setActiveValue(match.Value);
		}
	}

	private clearSearch(): void {
		// Cancel any pending OnSearch so a stale keyword doesn't fire after clearing.
		this.emitSearchDebounced.cancel();
		this.optionsListFocused = false;
		this.clearActive();
		this.searchKeyword = '';
		if (this.searchEl) this.searchEl.value = '';
		this.updateSearchClearVisibility();
		this.applySearch();
		this.actions.OnSearchClear();
		this.searchEl?.focus();
	}

	private updateSearchClearVisibility(): void {
		if (this.searchClearEl) this.searchClearEl.hidden = this.searchKeyword.length === 0;
	}

	private moveActive(direction: 1 | -1): void {
		const options = this.navigableOptions();
		if (options.length === 0) return;

		const currentIndex = options.findIndex((option) => option.Value === this.activeValue);
		let nextIndex = currentIndex + direction;

		if (nextIndex < 0) nextIndex = options.length - 1;
		if (nextIndex >= options.length) nextIndex = 0;

		this.setActiveValue(options[nextIndex].Value);
	}

	private setActiveValue(value: string | null): void {
		this.activeValue = value;
		for (const optionEl of this.optionEls()) {
			optionEl.dataset.active = optionEl.dataset.value === value ? 'true' : 'false';
		}
		this.updateActiveDescendant();

		if (value !== null) {
			const activeEl = this.listEl.querySelector<HTMLElement>(`.sapphiredropdown-option[data-value="${CSS.escape(value)}"]`);
			activeEl?.scrollIntoView({ block: 'nearest' });
		}
	}

	private clearActive(): void {
		this.activeValue = null;
		for (const optionEl of this.optionEls()) {
			optionEl.dataset.active = 'false';
		}
		this.updateActiveDescendant();
	}

	private updateActiveDescendant(): void {
		const owner = this.searchEl ?? this.triggerEl;
		if (this.activeValue !== null) {
			owner.setAttribute('aria-activedescendant', this.optionId(this.activeValue));
		} else {
			owner.removeAttribute('aria-activedescendant');
		}
	}

	private selectValue(value: string): void {
		const option = this.optionByValue(value);
		if (!option) return;

		if (this.config.Multiple) {
			const alreadySelected = this.isSelected(value);
			this.selectedList = alreadySelected ? this.selectedList.filter((item) => item.Value !== value) : [...this.selectedList, option];
			this.refreshSelectedState();
			this.updateTriggerLabel();
			this.emitChange();
			return;
		}

		this.selectedList = [option];
		this.refreshSelectedState();
		this.updateTriggerLabel();
		this.close();
		this.triggerEl.focus();
		this.emitChange();
	}

	private clearSelection(): void {
		this.selectedList = [];
		this.refreshSelectedState();
		this.updateTriggerLabel();
		this.actions.OnClear();
		this.emitChange();
	}

	// Emits the full selected list (always an array, even for single select) as a
	// JSON string, mirroring the array-shaped init optionsList/selectedList.
	private emitChange(): void {
		this.actions.OnChange(JSON.stringify(this.selectedList));
	}

	private refreshSelectedState(): void {
		for (const optionEl of this.optionEls()) {
			optionEl.setAttribute('aria-selected', this.isSelected(optionEl.dataset.value ?? '') ? 'true' : 'false');
		}
		this.updateSelectAllState();
	}

	private updateTriggerLabel(): void {
		this.widgetEl.dataset.hasvalue = this.selectedList.length > 0 ? 'true' : 'false';
		this.renderTriggerValue();
		if (this.hasChips) {
			this.renderChips();
		}
	}

	private createChipElement(option: ISapphireDropdownOption): HTMLElement {
		const chipEl = document.createElement('div');
		chipEl.className = 'chip';
		chipEl.dataset.value = option.Value;
		chipEl.dataset.hasclear = 'true';
		chipEl.dataset.enabled = this.enabled ? 'true' : 'false';

		if (this.config.ShowIcon && option.Icon) {
			const iconEl = document.createElement('div');
			iconEl.className = 'chip-icon';
			iconEl.innerHTML = Helpers.placeIcon(option.Icon, 's');
			iconEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
			chipEl.appendChild(iconEl);
		}

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

	private renderChips(): void {
		if (!this.chipsContainerEl) return;

		this.chipsContainerEl.replaceChildren();

		for (const option of this.selectedList) {
			this.chipsContainerEl.appendChild(this.createChipElement(option));
		}
	}

	private removeChipValue(value: string): void {
		if (!this.isSelected(value)) return;

		this.selectedList = this.selectedList.filter((item) => item.Value !== value);
		this.refreshSelectedState();
		this.updateTriggerLabel();
		this.emitChange();
	}

	// Renders the trigger text. Single select shows the one label (CSS ellipsis
	// handles overflow). Multiple joins all labels and collapses to a count
	// summary ("{n} selected") with a full-list title when it would overflow.
	private renderTriggerValue(): void {
		if (this.selectedList.length === 0) {
			this.valueEl.textContent = this.placeholder;
			this.valueEl.dataset.placeholder = 'true';
			this.valueEl.removeAttribute('title');
			return;
		}

		this.valueEl.dataset.placeholder = 'false';

		if (!this.config.Multiple) {
			this.valueEl.textContent = this.selectedList[0].Label;
			this.valueEl.removeAttribute('title');
			return;
		}

		const fullText = this.selectedList.map((option) => option.Label).join(', ');
		this.valueEl.textContent = fullText;
		this.valueEl.removeAttribute('title');

		if (this.isValueOverflowing()) {
			this.valueEl.textContent = `${this.selectedList.length} ${this.selectedOptionsText}`.trim();
			this.valueEl.title = fullText;
		}
	}

	private isValueOverflowing(): boolean {
		if (this.valueEl.clientWidth === 0) return false;
		return this.valueEl.scrollWidth > this.valueEl.clientWidth;
	}

	private isSelected(value: string): boolean {
		return this.selectedList.some((option) => option.Value === value);
	}

	// Single-select accepts at most one entry; discard extras from external payloads.
	private normalizeSelectedList(): void {
		// Drop entries with no Value; they can't be matched, rendered, or toggled.
		// Also drop placeholder-like "0" entries that carry no Label (empty selections
		// echoed back from OutSystems as Value="0").
		this.selectedList = this.selectedList.filter((item) => {
			const hasValue = item.Value !== null && item.Value !== undefined && item.Value !== '';
			if (!hasValue) return false;

			const hasLabel = item.Label !== null && item.Label !== undefined && item.Label !== '';
			if (item.Value === '0' && !hasLabel) return false;

			return true;
		});

		if (!this.config.Multiple && this.selectedList.length > 1) {
			this.selectedList = this.selectedList.slice(0, 1);
		}
	}

	// Selected items may arrive with empty fields (e.g. a payload that just echoes
	// the chosen values). Backfill any empty Label/Description/Icon per field from
	// the matching optionsList entry so the trigger and chips render full content.
	private hydrateSelectedList(): void {
		if (this.selectedList.length === 0 || this.optionsList.length === 0) return;

		this.selectedList = this.selectedList.map((selected) => {
			if (selected.Label && selected.Description && selected.Icon) return selected;

			const match = this.optionByValue(selected.Value);
			if (!match) return selected;

			return {
				Value: selected.Value,
				Label: selected.Label || match.Label,
				Description: selected.Description || match.Description,
				Icon: selected.Icon || match.Icon,
			};
		});
	}

	private optionByValue(value: string): ISapphireDropdownOption | undefined {
		return this.optionsList.find((option) => option.Value === value);
	}

	private optionEls(): HTMLElement[] {
		return Array.from(this.listEl.querySelectorAll<HTMLElement>('.sapphiredropdown-option'));
	}

	private navigableOptions(): ISapphireDropdownOption[] {
		return this.optionsList.filter((option) => this.isValueVisible(option.Value));
	}

	private isValueVisible(value: string): boolean {
		const optionEl = this.listEl.querySelector<HTMLElement>(`.sapphiredropdown-option[data-value="${CSS.escape(value)}"]`);
		return !!optionEl && !optionEl.hidden;
	}

	private firstNavigableValue(): string | null {
		return this.navigableOptions()[0]?.Value ?? null;
	}

	private lastNavigableValue(): string | null {
		const options = this.navigableOptions();
		return options[options.length - 1]?.Value ?? null;
	}

	parametersChanged(payload: ISapphireDropdown): void {
		if (!this.widgetEl) return;

		let needsLabelRefresh = false;
		let needsHydrate = false;
		if (payload.enabled !== undefined && payload.enabled !== this.enabled) {
			this.enabled = payload.enabled;
			this.widgetEl.dataset.enabled = this.enabled ? 'true' : 'false';
			this.triggerEl.tabIndex = this.enabled ? 0 : -1;
			if (!this.enabled) {
				this.close();
			}
			needsLabelRefresh = true;
		}

		if (payload.optionsList && !Helpers.areTheyEqual(payload.optionsList, this.optionsList)) {
			this.optionsList = payload.optionsList;
			this.renderOptions();
			needsLabelRefresh = true;
			needsHydrate = true;
		}

		if (payload.selectedList && !Helpers.areTheyEqual(payload.selectedList, this.selectedList)) {
			this.selectedList = payload.selectedList;
			this.normalizeSelectedList();
			this.refreshSelectedState();
			needsLabelRefresh = true;
			needsHydrate = true;
		}

		// Backfill any value-only selected items against the current options before
		// the trigger/chips re-render.
		if (needsHydrate) {
			this.hydrateSelectedList();
		}

		if (payload.isSearching !== undefined && payload.isSearching !== this.isSearching) {
			this.isSearching = payload.isSearching;
			this.updateLoadingState();
		}

		let needsValidationRefresh = false;
		if (payload.isValid !== undefined && payload.isValid !== this.isValid) {
			this.isValid = payload.isValid;
			this.widgetEl.dataset.isvalid = this.isValid ? 'true' : 'false';
			needsValidationRefresh = true;
		}

		if (payload.validationMessage !== undefined && payload.validationMessage !== this.validationMessage) {
			this.validationMessage = payload.validationMessage;
			needsValidationRefresh = true;
		}

		if (needsValidationRefresh) {
			this.validationMessageCtrl.update(this.isValid, this.validationMessage);
		}

		if (needsLabelRefresh) {
			this.updateTriggerLabel();
		}
	}

	destroy(): void {
		super.destroy();

		clearTimeout(this.typeaheadTimer);
		this.stopPositionWatch();
		this.triggerResizeObserver?.disconnect();
		this.triggerEl?.removeEventListener('click', this.onTriggerClick);
		this.triggerEl?.removeEventListener('keydown', this.onTriggerKeyDown);
		this.listEl?.removeEventListener('mousedown', this.onListMouseDown);
		this.listEl?.removeEventListener('click', this.onListClick);
		this.listEl?.removeEventListener('scroll', this.onListScroll);
		this.emitSearchDebounced?.cancel();
		this.searchEl?.removeEventListener('input', this.onSearchInput);
		this.searchEl?.removeEventListener('keydown', this.onSearchKeyDown);
		this.searchClearEl?.removeEventListener('click', this.onSearchClearClick);
		this.searchClearEl?.removeEventListener('keydown', this.onSearchClearKeyDown);
		this.clearEl?.removeEventListener('click', this.onClearClick);
		this.clearEl?.removeEventListener('keydown', this.onClearKeyDown);
		this.chipsContainerEl?.removeEventListener('click', this.onChipClearClick);
		this.chipsContainerEl?.removeEventListener('keydown', this.onChipClearKeyDown);

		this.tippyInstance?.destroy();
		this.tippyInstance = null;
		this.validationMessageCtrl.destroy();
	}
}
