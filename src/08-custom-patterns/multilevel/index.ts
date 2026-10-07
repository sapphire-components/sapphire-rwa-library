import { BaseComponent, type BaseComponentInit } from '@core/base';
import ButtonDropdown, { type IButtonDropdown } from '@custom-components/buttons/buttondropdown';
import Helpers from '@utils/helpers';

interface IMultiLevel extends BaseComponentInit {
	actions: {
		OnAddChild: (parentId: number) => void;
		OnChangeSelected: (items: string) => void;
		OnChangeTree: (items: string) => void;
	};
	enabled: boolean;
	itemsAdd: IMultiLevelItem[];
	itemsRoot: IMultiLevelItem[];
	itemsTree: IMultiLevelItem[];
	modeEdit: boolean;
	modeSelect: boolean;
	textAddChild: string;
	textAddRoot: string;
}

interface IMultiLevelItem {
	Description: string;
	Enabled: boolean;
	Icon: string;
	Id: number;
	Label: string;
	Level: number;
	Order: number;
	ParentId: number;
	Selected: boolean;
}

export default class MultiLevel extends BaseComponent {
	private actions!: IMultiLevel['actions'];
	private enabled = true;
	private itemsAdd: IMultiLevelItem[] = [];
	private itemsTree: IMultiLevelItem[] = [];
	private itemsRoot: IMultiLevelItem[] = [];
	private modeEdit = false;
	private modeSelect = false;
	private textAddChild = '';
	private textAddRoot = '';

	private addActionsEl!: HTMLElement;
	private addOptionsEl!: HTMLElement;
	private addDropdown!: ButtonDropdown;
	private childDropdowns: ButtonDropdown[] = [];
	private childMenus = new Map<number, HTMLElement>();
	private listEl!: HTMLElement;
	private pendingParentId: number | null = null;

	private readonly onAddOptionClick = (event: MouseEvent): void => {
		const option = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
		if (!option || !this.addActionsEl.contains(option)) return;

		const id = Number(option.dataset.id);
		if (!Number.isFinite(id)) return;
		this.addRoot(id);
	};

	private readonly onListClick = (event: MouseEvent): void => {
		const clear = (event.target as HTMLElement).closest<HTMLButtonElement>('.chip-clear');
		if (clear && this.listEl.contains(clear)) {
			event.preventDefault();
			event.stopPropagation();

			const id = Number(clear.dataset.id);
			if (!Number.isFinite(id)) return;
			this.removeItem(id);
			return;
		}

		const label = (event.target as HTMLElement).closest<HTMLButtonElement>('.multilevel-add-child .buttondropdown-label');
		if (!label || !this.listEl.contains(label)) return;
		if (label.getAttribute('aria-expanded') === 'true') return;
		this.requestChildOptions(label);
	};

	private readonly onListKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;

		const label = (event.target as HTMLElement).closest<HTMLButtonElement>('.multilevel-add-child .buttondropdown-label');
		if (!label || !this.listEl.contains(label)) return;
		if (label.getAttribute('aria-expanded') === 'true') return;
		this.requestChildOptions(label);
	};

	private readonly onAddChildClick = (event: MouseEvent): void => {
		const option = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-parent-id]');
		if (!option) return;

		const id = Number(option.dataset.id);
		const parentId = Number(option.dataset.parentId);
		if (!Number.isFinite(id) || !Number.isFinite(parentId)) return;
		this.addChild(parentId, id);
	};

	private readonly onSelectChange = (event: Event): void => {
		const input = (event.target as HTMLElement).closest<HTMLInputElement>('.multilevel-select');
		if (!input || !this.listEl.contains(input) || !this.modeSelect) return;

		const id = Number(input.dataset.id);
		if (!Number.isFinite(id)) return;

		const item = this.itemsTree.find((entry) => entry.Id === id);
		if (!item) return;

		item.Selected = input.checked;
		const chip = input.closest<HTMLElement>('.chip');
		if (chip) chip.dataset.isselected = item.Selected ? 'true' : 'false';

		this.actions?.OnChangeSelected(JSON.stringify(this.selectedIds()));
	};

	private readonly onAddRootLabelClick = (event: MouseEvent): void => {
		const label = event.currentTarget as HTMLButtonElement;
		if (label.getAttribute('aria-expanded') === 'true') return;
		this.focusFilter(this.addActionsEl);
	};

	private readonly onFilterInput = (event: Event): void => {
		const input = event.currentTarget as HTMLInputElement;
		const menu = input.closest<HTMLElement>('.buttondropdown-actions');
		if (!menu) return;
		this.applyFilter(menu, input.value);
	};

	private readonly onFilterKeyDown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape' || event.key === 'Esc') return;
		event.stopPropagation();
	};

	constructor(init: IMultiLevel) {
		super(init);

		if (!this.widgetEl) {
			console.warn('MultiLevel: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.enabled = init.enabled;
		this.modeEdit = init.modeEdit;
		this.modeSelect = init.modeSelect;
		this.textAddChild = init.textAddChild ?? '';
		this.textAddRoot = init.textAddRoot ?? '';
		this.itemsAdd = this.asItems(init.itemsAdd);
		this.itemsTree = this.asItems(init.itemsTree);
		this.itemsRoot = this.asItems(init.itemsRoot);
		this.build();
	}

	parametersChanged(payload: IMultiLevel): void {
		if (!this.widgetEl) return;

		let changed = false;

		if (payload.enabled !== undefined && payload.enabled !== this.enabled) {
			this.enabled = payload.enabled;
			this.widgetEl.dataset.enabled = this.enabled ? 'true' : 'false';
			this.addDropdown.parametersChanged(this.dropdownConfig());
			changed = true;
		}

		const itemsAddChanged = payload.itemsAdd !== undefined;
		if (itemsAddChanged) this.itemsAdd = this.asItems(payload.itemsAdd);

		if (payload.itemsTree !== undefined) {
			const itemsTree = this.asItems(payload.itemsTree);
			if (!Helpers.areTheyEqual(itemsTree, this.itemsTree)) {
				this.itemsTree = itemsTree;
				changed = true;
			}
		}

		if (payload.itemsRoot !== undefined) {
			const itemsRoot = this.asItems(payload.itemsRoot);
			if (!Helpers.areTheyEqual(itemsRoot, this.itemsRoot)) {
				this.itemsRoot = itemsRoot;
				changed = true;
			}
		}

		if (payload.modeEdit !== undefined && payload.modeEdit !== this.modeEdit) {
			this.modeEdit = payload.modeEdit;
			changed = true;
		}

		if (payload.modeSelect !== undefined && payload.modeSelect !== this.modeSelect) {
			this.modeSelect = payload.modeSelect;
			changed = true;
		}

		const rootTextChanged = payload.textAddRoot !== undefined && payload.textAddRoot !== this.textAddRoot;
		const childTextChanged = payload.textAddChild !== undefined && payload.textAddChild !== this.textAddChild;
		if (payload.textAddRoot !== undefined) this.textAddRoot = payload.textAddRoot;
		if (payload.textAddChild !== undefined) this.textAddChild = payload.textAddChild;

		if (changed) {
			this.pendingParentId = null;
			this.render();
			return;
		}

		if (rootTextChanged) this.updateRootLabel();
		if (childTextChanged) this.updateChildLabels();
		if (itemsAddChanged && this.pendingParentId !== null) this.fillChildMenu(this.pendingParentId);
	}

	destroy(): void {
		this.widgetEl?.querySelector<HTMLButtonElement>('.multilevel-header .buttondropdown-label')?.removeEventListener('click', this.onAddRootLabelClick);
		this.addActionsEl?.querySelector<HTMLInputElement>('.multilevel-filter')?.removeEventListener('input', this.onFilterInput);
		this.addActionsEl?.querySelector<HTMLInputElement>('.multilevel-filter')?.removeEventListener('keydown', this.onFilterKeyDown);
		this.addActionsEl?.removeEventListener('click', this.onAddOptionClick);
		this.listEl?.removeEventListener('click', this.onListClick, true);
		this.listEl?.removeEventListener('keydown', this.onListKeyDown, true);
		this.listEl?.removeEventListener('change', this.onSelectChange);
		this.destroyChildDropdowns();
		this.addDropdown?.destroy();
		super.destroy();
	}

	private build(): void {
		this.widgetEl.classList.add('multilevel');
		this.widgetEl.dataset.enabled = this.enabled ? 'true' : 'false';
		this.widgetEl.replaceChildren();

		const header = document.createElement('div');
		header.className = 'multilevel-header';

		const dropdownEl = document.createElement('div');
		dropdownEl.id = this.addDropdownId();
		dropdownEl.className = 'buttondropdown';

		const label = document.createElement('button');
		label.type = 'button';
		label.className = 'btn buttondropdown-label';
		this.setButtonLabel(label, this.textAddRoot);
		label.insertAdjacentHTML('beforeend', Helpers.placeIcon('caret-down', 's'));
		label.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');

		this.addActionsEl = document.createElement('div');
		this.addActionsEl.className = 'buttondropdown-actions';
		this.addActionsEl.append(this.createFilterInput());

		this.addOptionsEl = document.createElement('div');
		this.addOptionsEl.className = 'multilevel-filter-options';
		this.addActionsEl.append(this.addOptionsEl);

		dropdownEl.append(label, this.addActionsEl);
		header.append(dropdownEl);

		this.listEl = document.createElement('div');
		this.listEl.className = 'multilevel-list';

		this.widgetEl.append(header, this.listEl);

		label.addEventListener('click', this.onAddRootLabelClick);
		this.addDropdown = new ButtonDropdown(this.dropdownConfig());
		this.addActionsEl.addEventListener('click', this.onAddOptionClick);
		this.listEl.addEventListener('click', this.onListClick, true);
		this.listEl.addEventListener('keydown', this.onListKeyDown, true);
		this.listEl.addEventListener('change', this.onSelectChange);
		this.render();
	}

	private dropdownConfig(): IButtonDropdown {
		return {
			actions: { OnClick: () => undefined },
			enabled: this.enabled,
			isSplitButton: false,
			isValid: true,
			placement: 'bottom-end',
			runtimeId: this.addDropdownId(),
			validationMessage: '',
		};
	}

	private addDropdownId(): string {
		return `${this.runtimeId}-add-root`;
	}

	private render(): void {
		this.renderAddMenu();
		this.renderList();
	}

	private renderAddMenu(): void {
		const used = new Set(this.itemsTree.map((item) => item.Id));
		const available = this.itemsRoot.filter((item) => !used.has(item.Id));
		this.fillOptions(this.addOptionsEl, available);
	}

	private renderList(): void {
		this.destroyChildDropdowns();
		this.listEl.replaceChildren();

		for (const item of this.orderedItems()) {
			const row = this.createRow(item);
			this.listEl.append(row);
			if (!this.modeEdit) continue;

			const dropdownEl = row.querySelector<HTMLElement>('.multilevel-add-child');
			const actionsEl = dropdownEl?.querySelector<HTMLElement>('.multilevel-child-actions');
			const labelEl = dropdownEl?.querySelector<HTMLButtonElement>('.buttondropdown-label');
			if (!dropdownEl || !actionsEl || !labelEl) continue;

			const parentId = Number(dropdownEl.dataset.parentId);
			if (Number.isFinite(parentId)) this.childMenus.set(parentId, actionsEl);

			this.childDropdowns.push(new ButtonDropdown(this.childDropdownConfig(dropdownEl.id)));
			actionsEl.addEventListener('click', this.onAddChildClick);
		}
	}

	private childDropdownConfig(runtimeId: string): IButtonDropdown {
		return {
			actions: { OnClick: () => undefined },
			enabled: this.enabled,
			isSplitButton: false,
			isValid: true,
			placement: 'bottom-start',
			runtimeId,
			validationMessage: '',
		};
	}

	private destroyChildDropdowns(): void {
		for (const [, actionsEl] of this.childMenus) {
			actionsEl.removeEventListener('click', this.onAddChildClick);
		}

		for (const dropdown of this.childDropdowns) dropdown.destroy();
		this.childDropdowns = [];
		this.childMenus.clear();
	}

	private requestChildOptions(label: HTMLButtonElement): void {
		const parentId = Number(label.dataset.parentId);
		if (!Number.isFinite(parentId)) return;

		this.pendingParentId = parentId;
		this.fillChildMenu(parentId);
		this.focusFilter(this.childMenus.get(parentId) ?? null);
		this.actions?.OnAddChild(parentId);
	}

	private fillChildMenu(parentId: number): void {
		const actionsEl = this.childMenus.get(parentId);
		const optionsEl = actionsEl?.querySelector<HTMLElement>('.multilevel-filter-options');
		if (!optionsEl) return;
		this.fillOptions(optionsEl, this.availableChildItems(parentId), parentId);
	}

	private availableChildItems(parentId: number): IMultiLevelItem[] {
		const children = this.itemsTree.filter((item) => item.ParentId === parentId);
		return this.itemsAdd.filter((item) => !children.some((child) => child.Id === item.Id && child.Label === item.Label));
	}

	private fillOptions(optionsEl: HTMLElement, items: IMultiLevelItem[], parentId?: number): void {
		optionsEl.replaceChildren(...items.map((item) => this.createAddOption(item, parentId)));
		const menu = optionsEl.closest<HTMLElement>('.buttondropdown-actions');
		const input = menu?.querySelector<HTMLInputElement>('.multilevel-filter');
		if (menu && input) this.applyFilter(menu, input.value);
	}

	private applyFilter(menu: HTMLElement, query: string): void {
		const needle = query.trim().toLowerCase();
		for (const option of menu.querySelectorAll<HTMLButtonElement>('.multilevel-add-option')) {
			const text = option.textContent?.toLowerCase() ?? '';
			option.hidden = needle.length > 0 && !text.includes(needle);
		}
	}

	private focusFilter(menu: HTMLElement | null): void {
		const input = menu?.querySelector<HTMLInputElement>('.multilevel-filter');
		if (!input) return;
		requestAnimationFrame(() => input.focus());
	}

	private createFilterInput(): HTMLInputElement {
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'multilevel-filter';
		input.autocomplete = 'off';
		input.addEventListener('input', this.onFilterInput);
		input.addEventListener('keydown', this.onFilterKeyDown);
		return input;
	}

	private setButtonLabel(label: HTMLElement, text: string): void {
		let textEl = label.querySelector('.multilevel-button-text');
		if (!textEl) {
			textEl = document.createElement('span');
			textEl.className = 'multilevel-button-text';
			label.prepend(textEl);
		}
		textEl.textContent = text;
	}

	private updateRootLabel(): void {
		const label = this.widgetEl.querySelector<HTMLElement>('.multilevel-header .buttondropdown-label');
		if (label) this.setButtonLabel(label, this.textAddRoot);
	}

	private updateChildLabels(): void {
		for (const label of this.widgetEl.querySelectorAll<HTMLElement>('.multilevel-add-child .buttondropdown-label')) {
			this.setButtonLabel(label, this.textAddChild);
		}
	}

	private childDropdownId(parentId: number): string {
		return `${this.runtimeId}-add-child-${parentId}`;
	}

	private createAddOption(item: IMultiLevelItem, parentId?: number): HTMLButtonElement {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'buttondropdown-item multilevel-add-option';
		button.dataset.id = String(item.Id);
		if (parentId !== undefined) button.dataset.parentId = String(parentId);

		if (item.Icon) {
			button.insertAdjacentHTML('beforeend', Helpers.placeIcon(item.Icon, 's'));
			button.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		}

		const label = document.createElement('span');
		label.textContent = this.itemText(item);
		button.append(label);
		return button;
	}

	private createRow(item: IMultiLevelItem): HTMLElement {
		const row = document.createElement('div');
		row.className = 'multilevel-row';
		row.style.setProperty('--level', String(item.Level));

		if (item.Level > 0) {
			const elbow = document.createElement('span');
			elbow.className = 'multilevel-elbow';
			elbow.setAttribute('aria-hidden', 'true');
			row.append(elbow);
		}

		row.append(this.createChip(item));
		if (this.modeEdit) row.append(this.createChildDropdown(item));
		return row;
	}

	private createChildDropdown(parent: IMultiLevelItem): HTMLElement {
		const dropdownEl = document.createElement('div');
		dropdownEl.id = this.childDropdownId(parent.Id);
		dropdownEl.className = 'buttondropdown multilevel-add-child';
		dropdownEl.dataset.parentId = String(parent.Id);

		const label = document.createElement('button');
		label.type = 'button';
		label.className = 'btn buttondropdown-label';
		label.dataset.parentId = String(parent.Id);
		this.setButtonLabel(label, this.textAddChild);

		const actionsEl = document.createElement('div');
		actionsEl.className = 'buttondropdown-actions multilevel-child-actions';
		actionsEl.append(this.createFilterInput());

		const optionsEl = document.createElement('div');
		optionsEl.className = 'multilevel-filter-options';
		actionsEl.append(optionsEl);

		dropdownEl.append(label, actionsEl);
		return dropdownEl;
	}

	private createChip(item: IMultiLevelItem): HTMLElement {
		const chip = document.createElement('div');
		chip.className = 'chip';
		chip.dataset.enabled = this.enabled && item.Enabled ? 'true' : 'false';
		chip.dataset.hasclear = this.modeEdit ? 'true' : 'false';
		if (item.Selected) chip.dataset.isselected = 'true';

		if (item.Icon) {
			const icon = document.createElement('span');
			icon.className = 'chip-icon';
			icon.innerHTML = Helpers.placeIcon(item.Icon, 's');
			icon.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
			chip.append(icon);
		}

		if (this.modeSelect) chip.append(this.createSelectCheckbox(item));

		const content = document.createElement('div');
		content.className = 'chip-content';
		content.textContent = this.itemText(item);
		chip.append(content);

		if (this.modeEdit) chip.append(this.createClearButton(item));
		return chip;
	}

	private createSelectCheckbox(item: IMultiLevelItem): HTMLInputElement {
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.className = 'multilevel-select small';
		input.setAttribute('data-checkbox', '');
		input.dataset.id = String(item.Id);
		input.checked = item.Selected;
		input.disabled = !this.enabled;
		return input;
	}

	private selectedIds(): number[] {
		return this.orderedItems()
			.filter((item) => item.Selected)
			.map((item) => item.Id);
	}

	private createClearButton(item: IMultiLevelItem): HTMLButtonElement {
		const clear = document.createElement('button');
		clear.type = 'button';
		clear.className = 'chip-clear';
		clear.dataset.id = String(item.Id);
		clear.setAttribute('aria-label', 'Remove');
		clear.disabled = !this.enabled;
		clear.innerHTML = Helpers.placeIcon('x', 's');
		clear.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		return clear;
	}

	private itemText(item: IMultiLevelItem): string {
		return `${item.Id} - ${item.Label}`;
	}

	// Depth-first: each parent, then its children by Order, before the next sibling.
	private orderedItems(): IMultiLevelItem[] {
		const groups = new Map<number, { index: number; item: IMultiLevelItem }[]>();

		this.itemsTree.forEach((item, index) => {
			const parentId = item.ParentId ?? 0;
			const siblings = groups.get(parentId);
			const entry = { index, item };
			if (siblings) siblings.push(entry);
			else groups.set(parentId, [entry]);
		});

		for (const siblings of groups.values()) {
			siblings.sort((a, b) => a.item.Order - b.item.Order || a.index - b.index);
		}

		const ordered: IMultiLevelItem[] = [];
		const seen = new Set<number>();

		const visit = (parentId: number): void => {
			for (const { item } of groups.get(parentId) ?? []) {
				if (seen.has(item.Id)) continue;
				seen.add(item.Id);
				ordered.push(item);
				visit(item.Id);
			}
		};

		visit(0);
		return ordered;
	}

	private addRoot(id: number): void {
		if (!this.enabled) return;
		if (this.itemsTree.some((item) => item.Id === id)) return;

		const source = this.itemsRoot.find((item) => item.Id === id);
		if (!source) return;

		const added: IMultiLevelItem = {
			...source,
			Level: 0,
			Order: this.nextRootOrder(),
			ParentId: 0,
		};

		this.itemsTree = [...this.itemsTree, added];
		this.render();
		this.emitChange();
	}

	private addChild(parentId: number, id: number): void {
		if (!this.enabled || !this.modeEdit) return;
		if (this.itemsTree.some((item) => item.Id === id)) return;

		const parent = this.itemsTree.find((item) => item.Id === parentId);
		const source = this.itemsAdd.find((item) => item.Id === id);
		if (!parent || !source) return;

		const added: IMultiLevelItem = {
			...source,
			Level: parent.Level + 1,
			Order: this.nextSiblingOrder(parentId),
			ParentId: parentId,
		};

		this.itemsTree = [...this.itemsTree, added];
		this.render();
		this.emitChange();
	}

	private removeItem(id: number): void {
		if (!this.enabled || !this.modeEdit) return;
		if (!this.itemsTree.some((item) => item.Id === id)) return;

		const remove = this.idsWithDescendants(id);
		this.itemsTree = this.itemsTree.filter((item) => !remove.has(item.Id));
		this.render();
		this.emitChange();
	}

	private idsWithDescendants(id: number): Set<number> {
		const remove = new Set<number>([id]);

		const visit = (parentId: number): void => {
			for (const item of this.itemsTree) {
				if (item.ParentId !== parentId || remove.has(item.Id)) continue;
				remove.add(item.Id);
				visit(item.Id);
			}
		};

		visit(id);
		return remove;
	}

	private emitChange(): void {
		this.actions?.OnChangeTree(JSON.stringify(this.itemsTree));
	}

	private nextRootOrder(): number {
		return this.nextSiblingOrder(0);
	}

	private nextSiblingOrder(parentId: number): number {
		let max = 0;
		for (const item of this.itemsTree) {
			if (item.ParentId !== parentId) continue;
			if (item.Order > max) max = item.Order;
		}
		return max + 1;
	}

	private asItems(value: IMultiLevelItem[] | undefined): IMultiLevelItem[] {
		return Array.isArray(value) ? [...value] : [];
	}
}
