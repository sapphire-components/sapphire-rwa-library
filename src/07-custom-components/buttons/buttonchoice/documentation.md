###### Overview

A button-styled toggle used to pick one or more options. The widget root (`.buttonchoice`) wraps a `.buttonchoice-wrapper` (leading icon + `.buttonchoice-content` placeholder) and, when invalid, a `.validation-message` below it. Inputs are reflected as `data-*` attributes on the root (`data-isselected`, `data-enabled`, `data-allowmultiple`, `data-groupname`, `data-isvalid`, `data-type`).

- Unselected, it matches a regular `.btn`. Selected (`IsSelected` = `True`) with an empty `Type` uses the primary background and white text.
- `Type` is optional. When set to an `Alert` value (`alert-info`, `alert-warning`, `alert-success`, `alert-error`), unselected uses the tinted semantic surface and selected uses the solid semantic colour. Empty, `null`, or unknown values stay empty (`data-type=""`) and keep the default colours — they do **not** fall back to `alert-info`.
- A leading icon is hardcoded in the widget: `square` / `check-square` when `AllowMultiple` is `True`, `radio-button-light` / `radio-button-fill` when it is `False`. Set `data-theme="hide-icon"` on the root to hide it.
- Buttons that share a non-empty `GroupName` on the same document act as a group. When `AllowMultiple` is `False`, selecting one deselects the others via `setSelected`. When `AllowMultiple` is `True`, each button toggles independently.
- When `IsValid` is `False`, the wrapper is marked invalid and `ValidationMessage` is shown below it.
- `Change` receives the **new** selected state. Client logic should assign that value to `IsSelected` (not invert it).
- `parametersChanged` re-reads the live host and updates selected, enabled, group, validity, and type state.

<hr>

###### Input parameters

| Property            | Type      | Description                                                                                                                               |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `AllowMultiple`     | `Boolean` | When `True`, group members can stay selected together. When `False`, selecting one deselects peers.                                       |
| `Enabled`           | `Boolean` | Enables or disables interaction. Disabled buttons are not focusable.                                                                      |
| `GroupName`         | `Text`    | Groups ButtonChoices on the same document. Empty means the button is not grouped.                                                         |
| `IsSelected`        | `Boolean` | Selected state. Without a `Type`, selected buttons use the primary background and white text.                                             |
| `IsValid`           | `Boolean` | When `False`, marks the component invalid and shows `ValidationMessage`.                                                                  |
| `Type`              | `Alert`   | Optional semantic variant. Empty / `null` leaves the default colours. Valid values: `alert-info`, `alert-warning`, `alert-success`, `alert-error`. |
| `ValidationMessage` | `Text`    | Message shown below the wrapper while `IsValid` is `False`.                                                                               |

<hr>

###### Placeholders

| Name      | Description                         |
| --------- | ----------------------------------- |
| `Content` | Element to be displayed as content. |

<hr>

###### Events

| Name     | Description                                                                              | Arguments                                                    |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `Change` | Fired when this button's selected state changes (user click or `setSelected` on a peer). | `Identifier(Text)`,`GroupName (Text)`,`IsSelected (Boolean)` |

<!--
<hr>

###### Client methods

| Name                      | Description                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setSelected(isSelected)` | Applies the selected state, swaps the leading icon, and fires `Change`. If selecting and `AllowMultiple` is `False`, deselects peers in the same `GroupName`. |
| `getSelected()`           | Returns the current selected state.                                                                                                                           |
-->
