###### Overview

A button-styled toggle used to pick one or more options. The widget root (`.buttonchoice`) wraps a `.buttonchoice-wrapper` (leading icon + `.buttonchoice-content` placeholder) and, when invalid, a `.validation-message` below it.

- Unselected, it matches a regular `.btn`. Selected (`IsSelected` = `True`), it uses the primary background and white text.
- A leading icon is hardcoded in the widget: `square` / `check-square` when `AllowMultiple` is `True`, `radio-button-light` / `radio-button-fill` when it is `False`.
- Buttons that share a non-empty `GroupName` on the same document act as a group. When `AllowMultiple` is `False`, selecting one deselects the others via `setSelected`. When `AllowMultiple` is `True`, each button toggles independently.
- When `IsValid` is `False`, the wrapper is marked invalid and `ValidationMessage` is shown below it.
- `Change` receives the **new** selected state. Client logic should assign that value to `IsSelected` (not invert it).

<hr>

###### Input parameters

| Property            | Type      | Description                                                                                         |
| ------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| `AllowMultiple`     | `Boolean` | When `True`, group members can stay selected together. When `False`, selecting one deselects peers. |
| `Enabled`           | `Boolean` | Enables or disables interaction. Disabled buttons are not focusable.                                |
| `GroupName`         | `Text`    | Groups ButtonChoices on the same document. Empty means the button is not grouped.                   |
| `IsSelected`        | `Boolean` | Selected state. Selected buttons use the primary background and white text.                         |
| `IsValid`           | `Boolean` | When `False`, marks the component invalid and shows `ValidationMessage`.                            |
| `ValidationMessage` | `Text`    | Message shown below the wrapper while `IsValid` is `False`.                                         |

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
