###### Overview

A hierarchical list built from a flat item collection. Each entry is shown as a chip (`Id - Label`), indented by `Level`, with an L connecting a child to its parent. Siblings share the same indent and are ordered by `Order`.

- The only existing element is the component root. The header, menus, and rows are created inside it.
- Roots are the items whose `ParentId` is `0`. The list is walked depth-first: each item, then its children (by `Order`), before the next sibling. Equal `Order` values keep input order.
- The top-end button, labelled with `TextAddRoot`, opens a menu of `ItemsRoot` entries whose `Id` is not already in `ItemsTree`. Choosing one appends it as a root (`Level` `0`, `ParentId` `0`, `Order` one past the current highest root) and fires `ChangeTree`.
- When `ModeEdit` is `True`, every chip has a clear control and an **Add child** button (labelled with `TextAddChild`) after it. Clear removes that item and every descendant, then fires `ChangeTree`. The add-child button stays faint until hover, focus, or while its menu is open.
- Clicking **Add child** fires `AddChild` with that chip's `Id` and opens a menu of `ItemsAdd`. An entry is hidden when that parent already has a direct child with the same `Id` and `Label`. Choosing one appends it under that parent (`Level` one deeper, `ParentId` set to the chip) and fires `ChangeTree`.
- Both menus have a text field that filters the visible options by the `Id - Label` text. If `ItemsAdd` does not change after `AddChild`, the menu keeps the options already loaded.
- When `ModeSelect` is `True`, each chip has a checkbox immediately before its text. Checkboxes are independent: toggling one does not change parents or descendants. `ChangeSelected` fires with the ids that are currently selected, in display order.
- When `Enabled` is `False`, the add buttons, clear controls, and checkboxes do not accept input.

<hr>

###### Input parameters

| Name           | Type              | Description                                                                                                      |
| -------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Enabled`      | `Boolean`         | Enables or disables the add buttons, clear controls, and checkboxes.                                            |
| `ItemsAdd`     | `MultiLevelItem List` | Options offered by **Add child**. Refreshed from outside after `AddChild`; entries already present as a matching child are not shown. |
| `ItemsRoot`    | `MultiLevelItem List` | Options offered by the root add button. Entries whose `Id` is already in `ItemsTree` are not shown.         |
| `ItemsTree`    | `MultiLevelItem List` | The hierarchy currently displayed. Flat list; parentage comes from `ParentId`.                             |
| `ModeEdit`     | `Boolean`         | When `True`, shows the clear control and the **Add child** button on every chip.                                |
| `ModeSelect`   | `Boolean`         | When `True`, shows an independent checkbox before each chip's text.                                             |
| `TextAddChild` | `Text`            | Label of the per-chip add button.                                                                                |
| `TextAddRoot`  | `Text`            | Label of the root add button at the top end of the component.                                                   |

<hr>

###### `MultiLevelItem` structure

| Property      | Type      | Description                                                                                          |
| ------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `Description` | `Text`    | Carried on the item and returned in `ChangeTree`. Not rendered.                                      |
| `Enabled`     | `Boolean` | When `False`, the chip is shown disabled.                                                           |
| `Icon`        | `Text`    | Optional icon name shown before the text. Empty hides the icon.                                     |
| `Id`          | `Integer` | Identifier. Shown as `Id - Label`. Also used to hide root options that are already in the tree.     |
| `Label`       | `Text`    | Text shown after the id. Together with `Id`, used to hide duplicate children.                       |
| `Level`       | `Integer` | Visual depth. `0` is the root indent; each step adds one indent. Not calculated from `ParentId`.    |
| `Order`       | `Integer` | Sort position among items with the same `ParentId`.                                                 |
| `ParentId`    | `Integer` | `Id` of the parent. `0` marks a root.                                                                |
| `Selected`    | `Boolean` | Checked state when `ModeSelect` is `True`.                                                          |

<hr>

###### Events

| Name             | Description                                                                                          | Arguments                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `AddChild`       | Fired when **Add child** is activated, before an option is chosen.                                  | `Identifier` (`Text`), `ParentId` (`Integer`)          |
| `ChangeSelected` | Fired when a checkbox changes. The list is every selected id, in display order.                     | `Identifier` (`Text`), `SelectedIds` (`Integer List`)  |
| `ChangeTree`     | Fired after a root is added, a child is added, or an item (and its descendants) is removed.         | `Identifier` (`Text`), `ItemsTree` (`MultiLevelItem List`) |
