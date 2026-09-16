###### Overview

A compact control that renders seven rounded weekday buttons for picking one or more days of the week. Labels are locale-aware, selection is capped by a target count, and the stable day values follow ISO weekday numbering regardless of display order.

- The component generates all seven buttons into the `.weekdaypicker` root; there is no content placeholder.
- Day values are always ISO-style integers: `1` = Monday … `7` = Sunday. `WeekStart` only changes the visual order of the buttons.
- Button labels use `Intl.DateTimeFormat` with `WeekDayFormat` (`narrow`, `short`, or `long`). Each button also has a `title` with the `long` weekday name for hover clarity.
- `Locale` drives formatting. When it is empty / nullish, the component falls back to `SapphireRWALibrary.State.locale`, then to `en-US`.
- The user can select up to `SelectableCount` days. When that count is reached, unselected days become disabled; deselecting a selected day re-enables them.
- `SelectableCount` updates from outside (via `parametersChanged`) are applied immediately: selection is clamped to the new cap and disabled state is refreshed.
- `Selected` seeds or updates the active days from outside (via init / `parametersChanged`). Extra values beyond `SelectableCount` are ignored.
- `Change` fires on every user toggle (select or deselect), passing `Identifier` and the current selected ISO days (in selection order).
- `Density` controls button size. Only `Compact` and `Default` from `SapphireDensity` are supported; other density values are not applied.

<hr>

###### Input parameters

| Name              | Type              | Description                                                                                                                                                                                                                                              |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Density`         | `SapphireDensity` | Visual density of the day buttons. Supported values: `Compact` (smaller buttons) and `Default` (standard size). Other `SapphireDensity` entries (`Dense`, `Comfortable`) are not used by this component.                                                 |
| `Enabled`         | `Boolean`         | Enables or disables all interaction. Disabled pickers ignore clicks and use disabled styling (`data-enabled` on the root is typically set by the platform).                                                                                              |
| `Locale`          | `Text`            | BCP 47 locale code (for example `en-US`, `pt-PT`) used for weekday labels. Empty / nullish falls back to `SapphireRWALibrary.State.locale`, then `en-US`.                                                                                                |
| `SelectableCount` | `Integer`         | Maximum number of weekdays the user can select (`0`–`7`). When the current selection reaches this count, remaining unselected days are disabled until one is deselected. Updates via `parametersChanged` clamp the selection and refresh disabled state. |
| `Selected`        | `Text`            | Currently selected ISO weekdays. Accepts a JSON array string such as `"[1,3,5]"` (same shape as the serialized selection), or an equivalent list of integers `1`–`7`. Values outside that range are ignored.                                             |
| `WeekDayFormat`   | `Text`            | Visible label length passed to `Intl`. Supported values: `narrow` (e.g. `M`), `short` (e.g. `Mon`), `long` (e.g. `Monday`). Invalid values default to `short`. Hover `title` always uses `long`.                                                         |
| `WeekStart`       | `Integer`         | First day shown in the row, using ISO numbering (`1` = Monday … `7` = Sunday). Only affects display order; selected values stay ISO-stable. Invalid values default to `1`.                                                                               |

<hr>

###### Events

| Name     | Description                                                                              | Arguments                                      |
| -------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `Change` | Fired on every user select or deselect, with the current selection (in selection order). | `Identifier` (`Text`), `Days` (`Integer List`) |
