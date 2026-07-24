###### Overview

A compact control that renders seven rounded weekday buttons for picking one or more days of the week. Labels are locale-aware, selection is capped by a target count, and the stable day values follow ISO weekday numbering regardless of display order.

- The component generates all seven buttons into the `.weekdaypicker` root; there is no content placeholder.
- Day values are always ISO-style integers: `1` = Monday … `7` = Sunday. `WeekStart` only changes the visual order of the buttons.
- Button labels use `Intl.DateTimeFormat` with `WeekDayFormat` (`narrow`, `short`, or `long`). Each button also has a `title` with the `long` weekday name for hover clarity.
- `Locale` drives formatting. When it is empty / nullish, the component falls back to `SapphireRWALibrary.State.locale`, then to `en-US`.
- The user can select up to `SelectableCount` days. When that count is reached, unselected days become disabled; deselecting a selected day re-enables them.
- `Selected` seeds or updates the active days from outside (via init / `parametersChanged`). Extra values beyond `SelectableCount` are ignored.
- `Change` fires only when the selection reaches `SelectableCount`, passing `Identifier` and the selected ISO days.

<hr>

###### Input parameters

| Name              | Type      | Description                                                                                                                                                                                                  |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Enabled`         | `Boolean` | Enables or disables all interaction. Disabled pickers ignore clicks and use disabled styling (`data-enabled` on the root is typically set by the platform).                                                  |
| `Locale`          | `Text`    | BCP 47 locale code (for example `en-US`, `pt-PT`) used for weekday labels. Empty / nullish falls back to `SapphireRWALibrary.State.locale`, then `en-US`.                                                    |
| `SelectableCount` | `Integer` | Maximum number of weekdays the user can select (`0`–`7`). When the current selection reaches this count, remaining unselected days are disabled until one is deselected.                                     |
| `Selected`        | `Text`    | Currently selected ISO weekdays. Accepts a JSON array string such as `"[1,3,5]"` (same shape as the serialized selection), or an equivalent list of integers `1`–`7`. Values outside that range are ignored. |
| `WeekDayFormat`   | `Text`    | Visible label length passed to `Intl`. Supported values: `narrow` (e.g. `M`), `short` (e.g. `Mon`), `long` (e.g. `Monday`). Invalid values default to `short`. Hover `title` always uses `long`.             |
| `WeekStart`       | `Integer` | First day shown in the row, using ISO numbering (`1` = Monday … `7` = Sunday). Only affects display order; selected values stay ISO-stable. Invalid values default to `1`.                                   |

<hr>

###### Events

| Name     | Description                                                                               | Arguments                                      |
| -------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `Change` | Fired when the user reaches exactly `SelectableCount` selected days (in selection order). | `Identifier` (`Text`), `Days` (`Integer List`) |
