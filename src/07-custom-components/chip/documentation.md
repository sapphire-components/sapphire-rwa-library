###### Overview

A compact, interactive element used to represent an attribute, filter, selection, or action. Chips can be clickable, selectable (toggle), and optionally include a leading icon and a clear button.

The `Chip` enhances a root element containing a `.chip-content` node. Based on its configuration it wires up click, toggle, and clear interactions, reflects its state through `data-*` attributes, and manages the appropriate ARIA roles and keyboard support.

<hr>

###### Input parameters

| Property       | Type      | Description                                                            |
| -------------- | --------- | ---------------------------------------------------------------------- |
| `Enabled`      | `Boolean` | Enables or disables all interaction. Disabled chips are not focusable. |
| `HasClear`     | `Boolean` | Renders a trailing clear button.                                       |
| `Icon`         | `Text`  | Optional leading icon name rendered before the content.                |
| `IsClickable`  | `Boolean` | Makes the whole chip act as a button firing `Click`.                   |
| `IsSelectable` | `Boolean` | Makes the chip a toggle that fires `Toggle` and tracks selected state. |
| `IsSelected`   | `Boolean` | Initial selected state (only meaningful when `IsSelectable`).          |

<hr>

###### Placeholders

| Name      | Description                         |
| --------- | ----------------------------------- |
| `Content` | Element to be displayed as content. |

<hr>

###### Events

| Name     | Description                                                               |
| -------- | ------------------------------------------------------------------------- |
| `Clear`  | Fired when the clear button is activated.                                 |
| `Click`  | Fired when a clickable chip is activated (click or `Enter`/`Space`).      |
| `Toggle` | Fired when a selectable chip is toggled; receives the new selected state. |
