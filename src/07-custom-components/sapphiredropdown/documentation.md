###### Overview

A combobox-style dropdown for selecting one or many options from a list. It supports search (client- or server-side), select-all, chips for selected values, clear, keyboard navigation / typeahead, and a validation message.

- The trigger is a focusable combobox; activating it (click or keyboard) opens a Tippy panel with the options listbox. Selected options that are not in the current `OptionsList` are prepended in that list (so a paged or filtered payload still shows the current selection).
- Single select closes the panel after a choice. Multiple select keeps the panel open and toggles options; overflowing labels collapse to a count summary using `SelectedOptionsText`.
- When `Config.Search` is `True`, a search field filters options. Client-side search matches `Label` / `Description`; with `SearchServerSide`, typing emits `Search` (debounced 300ms) so the parent can refresh `OptionsList`.
- While `IsSearching` is `True`, the list is hidden and a loading spinner is shown (typical for server-side search).
- Scrolling the list near the bottom fires `ScrollEnded` once per reach (useful for paging more options).
- When `IsValid` is `False`, the trigger is marked invalid and `ValidationMessage` is shown below it.

<hr>

###### Input parameters

| Name                | Type                     | Description                                                                                                                            |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Config`            | `SapphireDropdownConfig` | Behaviour and copy for the dropdown. See the structure below.                                                                          |
| `Enabled`           | `Boolean`                | Enables or disables interaction. Disabled dropdowns are not focusable / interactive.                                                   |
| `IsSearching`       | `Boolean`                | When `True`, shows the loading state in the panel and hides the options list.                                                          |
| `IsValid`           | `Boolean`                | When `False`, marks the component invalid and shows `ValidationMessage`.                                                               |
| `OptionsList`       | `SapphireDropdownOption` | Available options to render in the list. Selected items whose `Value` is not in this list are prepended in the overlay (single or multiple). |
| `SelectedList`      | `SapphireDropdownOption` | Currently selected options. Single-select keeps at most one entry; missing labels/icons are hydrated from `OptionsList` when possible. Selected items not present in `OptionsList` still appear at the top of the overlay so they can be deselected. |
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
| `Clear`               | `Boolean` | When `True`, shows a clear control on the trigger while there is a selection.                                           |
| `HasChips`            | `Boolean` | When `True`, renders selected options as clearable chips below the trigger.                                             |
| `HasSelectAll`        | `Boolean` | When `True` and `Multiple` is `True`, adds a select-all row at the top of the list.                                     |
| `Multiple`            | `Boolean` | When `True`, allows multiple selections; when `False`, selecting an option replaces the selection and closes the panel. |
| `Placeholder`         | `Text`    | Trigger text when nothing is selected.                                                                                  |
| `Search`              | `Boolean` | When `True`, shows the search field in the panel.                                                                       |
| `SearchServerSide`    | `Boolean` | When `True`, search emits `Search` for the parent to filter; when `False`, options are filtered locally.                |
| `SearchKeyword`       | `Text`    | Current search keyword (kept in sync with the search input).                                                            |
| `SearchPlaceholder`   | `Text`    | Placeholder for the search input.                                                                                       |
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
| `Clear`       | Fired when the trigger clear control clears the entire selection (also followed by `Change`).                 | `Identifier` (`Text`)                                                |
| `ScrollEnded` | Fired when the options list is scrolled to (near) the bottom; resets when the user scrolls away from the end. | `Identifier` (`Text`)                                                |
| `SearchClear` | Fired when the search field is cleared.                                                                       | `Identifier` (`Text`)                                                |
| `Search`      | Fired (debounced) with the current keyword while searching; primarily used with `SearchServerSide`.           | `Identifier` (`Text`), `EmittedKeyword` (`Text`)                     |
