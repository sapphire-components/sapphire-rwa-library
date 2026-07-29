###### Overview

A styling helper that combines a platform `Checkbox` with a matching `Label` into a consistent inline layout.

- Renders as an `inline-flex` row with an 8px gap between the checkbox and the label.
- Applies a `pointer` cursor to the label area for better affordance.
- When the wrapped checkbox is a small input (`input.small`), it adds a 4px top padding to align the checkbox vertically.

The helper does not create the checkbox or the label content itself. You provide both via placeholders.

<hr>

###### Input parameters

| Name    | Type            | Description |
| ------- | --------------- | ----------- |
| `Width` | `SapphireScale` | Width preset for the helper container (used by the platform to size the inline-flex wrapper). |

<hr>

###### Placeholders

| Name       | Description |
| ---------- | ----------- |
| `Checkbox` | The platform checkbox input/markup to display. |
| `Label`    | The label text/markup associated with the checkbox. |
