###### Overview

A combobox-style dropdown for selecting one or many options from a list. It supports search (client- or server-side), select-all, chips for selected values, clear, keyboard navigation / typeahead, and a validation message.

- The trigger is a focusable combobox; activating it (click or keyboard) opens a Tippy panel with the options listbox. Selected options that are not in the current `OptionsList` are always prepended at the top of that list. In a virtual list those rows are the head of the scroll; a later page keeps their height in the top spacer so `SearchStartIndex` still lines up. A search refresh rebuilds the list from the top. The current selection still shows on the trigger and chips. An option label that overflows with an ellipsis gets a `title` tooltip with the full text.
- Single select closes the panel after a choice. Multiple select keeps the panel open and toggles options; overflowing labels collapse to a count summary using `SelectedOptionsText`.
- When `Config.Search` is `True`, a search field filters options. Client-side search matches `Label` / `Description`; with `SearchServerSide`, typing emits `Search` (debounced 300ms) so the parent can refresh `OptionsList`.
- With server-side search, `SearchMaxRecords`, `SearchStartIndex`, and `SearchTotalCount` size a virtual list. `OptionsList` is one page. Scrolling to a page that is not loaded fires `Scroll` with that start index. Skeletons fill the gap above and below the loaded page.
- While `IsSearching` is `True`, the options list is hidden and a loading spinner is shown, including later server-side fetches after the list is virtualized. Skeletons fill gaps in a virtual list only while `IsSearching` is `False`.
- Scrolling the list near the bottom fires `ScrollEnded` once per reach.
- When `IsValid` is `False`, the trigger is marked invalid and `ValidationMessage` is shown below it.

<hr>

###### Input parameters

| Name                | Type                     | Description                                                                                                                            |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Config`            | `SapphireDropdownConfig` | Behaviour and copy for the dropdown. See the structure below.                                                                          |
| `Enabled`           | `Boolean`                | Enables or disables interaction. Disabled dropdowns are not focusable / interactive.                                                   |
| `IsSearching`       | `Boolean`                | When `True`, shows the loading state in the panel and hides the options list.                                                          |
| `IsValid`           | `Boolean`                | When `False`, marks the component invalid and shows `ValidationMessage`.                                                               |
| `OptionsList`       | `SapphireDropdownOption` | Available options to render in the list. A search refresh replaces this list and scrolls to the top. Selected items whose `Value` is not in this list are prepended above it. |
| `SelectedList`      | `SapphireDropdownOption` | Currently selected options. Single-select keeps at most one entry; missing labels/icons are hydrated from `OptionsList` when possible. Selected items not present in `OptionsList` are prepended at the top, including on a virtual list. |
| `ValidationMessage` | `Text`                   | Message shown below the trigger while `IsValid` is `False`.                                                                            |
| `Width`             | `SapphireScale`          | Width preset for the dropdown (`auto`, `xs`–`xl7`, `full`, etc.). The open panel matches the trigger width.                            |

<hr>

###### `SapphireDropdownOption` structure

| Property      | Type   | Description                                                             |
| ------------- | ------ | ----------------------------------------------------------------------- |
| `Description` | `Text` | Optional secondary text under the label (shown when `ShowDescription`). |
| `Icon`        | `Text` | Optional icon name (shown when `ShowIcon`).                             |
| `Label`       | `Text` | Primary text shown in the list, trigger, and chips.                     |
| `Value`       | `Text` | Stable identifier for the option. Used for selection matching.          |

<hr>

###### `SapphireDropdownConfig` structure

| Property              | Type      | Description                                                                                                             |
| --------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ChipClick`           | `Boolean` | When `True`, chips in the chips area are clickable and fire `ChipClick` with the option `Value`. The chip clear button still only removes the chip. |
| `Clear`               | `Boolean` | When `True`, shows a clear control on the trigger while there is a selection.                                           |
| `HasChips`            | `Boolean` | When `True`, renders selected options as clearable chips below the trigger.                                             |
| `HasSelectAll`        | `Boolean` | When `True` and `Multiple` is `True`, adds a select-all row at the top of the list.                                     |
| `Multiple`            | `Boolean` | When `True`, allows multiple selections; when `False`, selecting an option replaces the selection and closes the panel. |
| `Placeholder`         | `Text`    | Trigger text when nothing is selected.                                                                                  |
| `Search`              | `Boolean` | When `True`, shows the search field in the panel.                                                                       |
| `SearchServerSide`    | `Boolean` | When `True`, the parent filters and pages through `Search` and `Scroll`. When `False`, options are filtered locally.    |
| `SearchKeyword`       | `Text`    | Search the current `OptionsList` belongs to. A change resets the virtual scroll to the top; the next `OptionsList` is rendered from the start. |
| `SearchMaxRecords`    | `Integer` | Page size for the virtual server-side list. `0` disables virtualization.                                                |
| `SearchPlaceholder`   | `Text`    | Placeholder for the search input.                                                                                       |
| `SearchStartIndex`    | `Integer` | Start index of the `OptionsList` page currently supplied. A scroll-requested page is pinned to this index. A search refresh starts at the top instead. |
| `SearchTotalCount`    | `Integer` | Total number of server matches. Sizes the virtual scroll. `0` disables virtualization.                                  |
| `ShowDescription`     | `Boolean` | When `True`, renders each option's `Description` when present.                                                          |
| `ShowIcon`            | `Boolean` | When `True`, renders each option's `Icon` when present (list, chips).                                                   |
| `NoOptionsText`       | `Text`    | Empty-state message when there are no options.                                                                          |
| `NoSearchResultsText` | `Text`    | Empty-state message when search yields no matches.                                                                      |
| `SelectAllText`       | `Text`    | Label for the select-all row.                                                                                           |
| `SelectedOptionsText` | `Text`    | Suffix used in the multi-select overflow summary, e.g. `"3 selected"` when labels do not fit.                           |

<hr>

###### Events

| Name          | Description                                                                                                   | Arguments                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Change`      | Fired when the selection changes.                                                                             | `Identifier` (`Text`), `EmittedList` (`SapphireDropdownOption List`) |
| `ChipClick`   | Fired when a chip is activated and `Config.ChipClick` is `True` (click, or `Enter` / `Space` on the chip).    | `Identifier` (`Text`), `Value` (`Text`)                              |
| `Clear`       | Fired when the trigger clear control clears the entire selection (also followed by `Change`).                 | `Identifier` (`Text`)                                                |
| `Scroll`      | Fired when a virtual server-side list is scrolled to a page that is not loaded.                                  | `Identifier` (`Text`), `StartIndex` (`Integer`)                      |
| `ScrollEnded` | Fired when the options list is scrolled to (near) the bottom; resets when the user scrolls away from the end. | `Identifier` (`Text`)                                                |
| `SearchClear` | Fired when the search field is cleared.                                                                       | `Identifier` (`Text`)                                                |
| `Search`      | Fired (debounced) with the current keyword while searching; primarily used with `SearchServerSide`.           | `Identifier` (`Text`), `EmittedKeyword` (`Text`)                     |
