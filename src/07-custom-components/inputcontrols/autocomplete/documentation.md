###### Overview

A combobox for choosing one or many options from a list. It supports client- or server-side search, chips, an optional add action, and keyboard navigation.

- The field is a focusable combobox. Click or keyboard opens a Tippy panel with the options listbox. Single select (`HasChips` `False`) shows the selected `Label` in the field, replaces the selection on choice, and closes the panel. With `HasChips`, selected options render as clearable chips and the field stays empty for the next search.
- `Label` is the text shown in the list, the field, and chips. Client-side search matches `Label`. `Value` is the stable identifier used to match a selection.
- When `SearchServerSide` is `False`, the list is filtered locally as the user types, and options already in `SelectedValues` are hidden. When it is `True`, typing emits `Search` after `SearchDebounce` so the parent can replace `OptionValues`. An empty `Keyword` keeps the server-side list empty and shows `TextPrompt`.
- With server-side search, `SearchPageSize`, `SearchStartIndex`, and `SearchTotalCount` size a virtual list. Scrolling to a page that is not loaded fires `Scroll` with that start index. While `IsLoading` is `True`, a non-virtual list shows a spinner; a virtual list keeps its rows and shows skeletons.
- When `AllowAdd` is `True`, the panel includes an add action for the current text. It fires `Add` with that text and does not change `SelectedValues`.
- `Select` fires when the user chooses an option or removes a chip. It sends the full current selection (one entry when `HasChips` is `False`). The widget passes that list as JSON; the event argument is the deserialized `AutocompleteOption List`.
- `Clear` fires when the field clear control removes the typed text. Dismissing the panel without that clear restores the selected `Label` in single select.

<hr>

###### Input parameters

| Name                | Type                      | Description                                                                                                                                          |
| ------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AllowAdd`          | `Boolean`                 | When `True`, shows an add action in the panel for the current text.                                                                                 |
| `Enabled`           | `Boolean`                 | Enables or disables interaction. Disabled fields are not interactive.                                                                               |
| `HasChips`          | `Boolean`                 | When `True`, selected options render as clearable chips. When `False`, the field shows the single selected `Label`.                                 |
| `IsLoading`         | `Boolean`                 | When `True`, shows the loading state. A non-virtual list is replaced by a spinner.                                                                  |
| `Keyword`           | `Text`                    | Search the current `OptionValues` belong to. Empty on server-side search leaves the list empty.                                                     |
| `OptionValues`      | `AutocompleteOption List` | Options rendered in the list. Entries without a string `Value` are ignored.                                                                         |
| `SearchDebounce`    | `Integer`                 | Delay in milliseconds before `Search` fires while typing. Used only when `SearchServerSide` is `True`.                                              |
| `SearchPageSize`    | `Integer`                 | Page size for the virtual server-side list. `0` disables virtualization.                                                                            |
| `SearchServerSide`  | `Boolean`                 | When `True`, the parent filters and pages through `Search` and `Scroll`. When `False`, `OptionValues` are filtered locally by `Label`.              |
| `SearchStartIndex`  | `Integer`                 | Start index of the `OptionValues` page currently supplied. The new page is pinned to this index when the rows arrive.                               |
| `SearchTotalCount`  | `Integer`                 | Total number of server matches. Sizes the virtual scroll. `0` disables virtualization.                                                              |
| `SelectedValues`    | `AutocompleteOption List` | Current selection. Single select keeps at most one entry, and the field shows that entry's `Label`.                                                 |
| `TextAdd`           | `Text`                    | Label of the add action. The current text is appended while the field is not empty.                                                                 |
| `TextNoRecords`     | `Text`                    | Message shown when the list has no matches.                                                                                                         |
| `TextPrompt`        | `Text`                    | Placeholder for the field, and the panel message while a server-side search has no `Keyword` yet.                                                   |
| `Theme`             | `Text`                    | Optional theme token applied as `data-theme` on the root. Empty removes it.                                                                         |

<hr>

###### `AutocompleteOption` structure

| Property | Type   | Description                                                                          |
| -------- | ------ | ------------------------------------------------------------------------------------ |
| `Label`  | `Text` | Text shown in the list, the field, and chips. Client-side search matches this.      |
| `Value`  | `Text` | Stable identifier. Selection, chips, and list matching use this. Empty values are dropped. |

<hr>

###### Events

| Name     | Description                                                                                                      | Arguments                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Add`    | Fired when the add action is activated. The parent adds the option; the selection is not changed here.          | `Identifier` (`Text`), `Value` (`Text`)                        |
| `Clear`  | Fired when the field clear control removes the typed text.                                                      | `Identifier` (`Text`)                                          |
| `Scroll` | Fired when a virtual server-side list is scrolled to a page that is not loaded.                                 | `Identifier` (`Text`), `StartIndex` (`Integer`)                |
| `Search` | Fired (debounced) with the current keyword. Used when `SearchServerSide` is `True`.                             | `Identifier` (`Text`), `EmittedKeyword` (`Text`)               |
| `Select` | Fired when the user chooses an option or removes a chip. The list is the full selection, including one-item single select. | `Identifier` (`Text`), `EmittedList` (`AutocompleteOption List`) |
