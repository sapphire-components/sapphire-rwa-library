###### Overview

A calendar date picker, with optional time, that generates its UI inside the widget root (`.datetimepicker`). By default a trigger shows the formatted value and opens the calendar in a Tippy panel. With `Config.Inline` = `True` the calendar is rendered in place and stays visible.

- **Selected / Change** are both a `DateTime List`. The block JSON-serializes `Selected` for the script, and the script emits a JSON array of ISO DateTimes that the block deserializes back into the list for `Change`. Empty is `[]`.
- **Single** (`Config.Mode` = `Single`, default): clicking a day selects it. Without time the panel closes after the pick. `Change` emits a list with one DateTime (local midnight, or the picked time when `ConfigTime.HasTime` is `True`). If `Selected` has several items, only the first is used.
- **Multiple** (`Config.Mode` = `Multiple`): clicking a day toggles it and the panel stays open. `Change` emits one DateTime per selected day (local midnight), sorted. Time is not used in this mode.
- **Range** (`Config.Mode` = `Range`): the first click sets the start, the second sets the end (in either order; the same day twice is a one-day range). While only the start is picked, the band previews up to the hovered or keyboard-focused day. `Change` fires only once the range is complete and emits two DateTimes, `[start, end]` (local midnight, equal for a one-day range). Closing the panel with only a start picked discards it. A click after a complete range starts a new one. From `Selected`, the earliest and latest items are used (one item = one-day range). Days in `Disabled` cannot be an endpoint, but a range may span them. Time is not used in this mode. By default two months are shown side by side (`Config.RangeTwoCalendars`), each with its own title; the arrows move one month, days of neighbouring months are left blank, and picking a day in the right-hand month does not scroll the view. Below a 640px viewport a single month is shown.
- **Apply button** (`Config.HasApplyButton` = `True`): days and time picked in the panel are a draft. The trigger keeps showing the applied value and `Change` does not fire until the user presses **Apply**, which commits the draft, fires `Change` once, and closes the panel (inline stays open). Closing without Apply (outside click, `Escape`, tabbing away) discards the draft. **Apply** is disabled while the draft equals the applied value, or while a range only has its start. The label follows `Locale` (`Apply`, `Aplicar`, …). A single date no longer closes the panel on pick in this mode. With `Config.HasClear` also `True`, the footer shows a **Clear** button opposite **Apply** (label follows `Locale`). It empties the draft only; pressing **Apply** then commits the empty value and fires `Change` with `[]`. It is disabled while the draft is empty.
- **Navigation**: the arrows move one month. With `Config.MonthYearNavigation` = `True` the title is clickable: days → month grid → year grid (12 years per page). Picking a year opens its months, picking a month opens its days. In those views the arrows move one year / one page of years.
- **Time** (`ConfigTime.HasTime` = `True`, `Single` mode only): hour / minute / second dropdowns appear under the calendar, driven by `TimeFormat`, `TimePrecision`, and `TimeStep` (same rules as `HourPicker`). Picking a date with no time yet sets `00:00:00`. Picking a time before a date applies it to the focused day. Every date or time change emits `Change`.
- **Bounds**: days outside `Config.MinDate` / `Config.MaxDate` are disabled. Arrows, month and year cells that fall entirely outside the range are disabled too.
- **Disabled days**: every day in the `Disabled` list (date part only) is shown greyed and struck through and cannot be picked by click, keyboard, or a time pick. A date that is already in `Selected` stays selected even if it is also disabled. The list can change at any time; the calendar updates without a rebuild.
- **Keyboard**: on the trigger, `Enter` / `Space` / `ArrowDown` opens. In the days grid, arrows move a day / week (jumping over disabled days), `Home` / `End` go to the start / end of the week, `PageUp` / `PageDown` move a month (`Shift` for a year), and `Enter` / `Space` picks. `Escape` goes back up one view, then closes.
- **Time zones**: ISO values with a zone (`Z` or `±hh:mm`, as produced by JSON Serialize) are converted to local time, and emitted values are local instants as ISO, so a DateTime round-trips to the same local day and hour.
- `Selected` is read only when it changes, so a parent that does not bind `Selected` back keeps the user's pick across unrelated refreshes. The OutSystems null date (`1900-01-01`) is treated as empty, both in `Selected` and in `MinDate` / `MaxDate`.
- Labels (month, weekdays, display value) follow `Locale`, falling back to the application locale, then `en-US`.

<hr>

###### Input parameters

| Name                | Type                       | Description                                                                                                         |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Config`            | `DateTimePickerConfig`     | Selection, navigation and display options. See the structure below.                                                 |
| `ConfigTime`        | `DateTimePickerConfigTime` | Time options. See the structure below.                                                                              |
| `Density`           | `SapphireDensity`          | Spacing preset for the trigger and the calendar. `Default` (40px trigger, 36px day cells) or `Compact` (32px trigger, 30px cells, smaller controls). `Dense` / `Comfortable` look like `Default` for now. |
| `Disabled`          | `DateTime List`            | Days that are shown but cannot be selected. Only the date part is used; `NullDate` items are ignored.              |
| `Enabled`           | `Boolean`                  | Enables or disables interaction.                                                                                    |
| `IsValid`           | `Boolean`                  | When `False`, marks the component invalid and shows `ValidationMessage`.                                            |
| `Locale`            | `Text`                     | BCP 47 locale for labels (e.g. `pt-PT`). Empty falls back to the application locale.                               |
| `Placeholder`       | `Text`                     | Trigger text when there is no value.                                                                                |
| `Selected`          | `DateTime List`            | Current value. Single mode uses the first item; multiple mode uses one item per day; range mode uses the earliest and latest items. Empty list means no value. |
| `SelectedText`      | `Text`                     | Multiple only. When set and more than one date is picked, the trigger shows `"<count> <SelectedText>"` (e.g. `3 dates`). |
| `ValidationMessage` | `Text`                     | Message shown below the component while `IsValid` is `False`.                                                       |
| `Width`             | `SapphireScale`            | Width preset for the trigger (`auto`, `xs`–`xl7`, `full`, etc.).                                                    |

<hr>

###### `DateTimePickerConfig` structure

| Property              | Type      | Description                                                                                                                                                         |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DisplayFormat`       | `Text`    | Optional mask for the trigger text, same tokens as the `DateTimeFormat` client action (e.g. `d/m/Y`, `d M Y H:i`). Empty uses the locale's medium date (and time). |
| `HasApplyButton`      | `Boolean` | When `True`, the panel shows an **Apply** button and picks stay a draft until it is pressed; see Overview. `False` (default) applies every pick immediately.         |
| `HasClear`            | `Boolean` | When `True`, shows a clear control on the trigger while there is a value and the component is enabled. Clearing emits `Change` with an empty list, right away (even with `HasApplyButton`).     |
| `Inline`              | `Boolean` | When `True`, renders the calendar in place instead of a trigger + popup.                                                                                            |
| `MaxDate`             | `Date`    | Latest selectable date, inclusive. `NullDate()` means no limit.                                                                                                     |
| `MinDate`             | `Date`    | Earliest selectable date, inclusive. `NullDate()` means no limit.                                                                                                   |
| `Mode`                | `DateTimePickerMode` | `Single` (default), `Multiple` or `Range`. See Overview.                                                                                                     |
| `MonthYearNavigation` | `Boolean` | When `True`, the header title opens month and year grids for faster jumps.                                                                                          |
| `RangeTwoCalendars`   | `Boolean` | `Range` mode only. `True` (default) shows two months side by side; `False` shows one. Always one month on viewports under 640px.                                 |
| `WeekStart`           | `Integer` | First day of the week, ISO: `1` Monday (default) … `7` Sunday.                                                                                                     |

<hr>

###### `DateTimePickerConfigTime` structure

| Property        | Type            | Description                                                                                      |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `HasTime`       | `Boolean`       | When `True` (`Single` mode), shows time dropdowns and keeps the picked time in the emitted value.  |
| `TimeFormat`    | `TimeFormat`    | `24h` (default) or `12h` with an AM/PM dropdown. Display only; values stay 24h.                 |
| `TimePrecision` | `TimePrecision` | `hour`, `minute` (default), or `second`. Controls which time dropdowns appear.                  |
| `TimeStep`      | `Integer`       | Minute step for `minute` precision, second step for `second`. `0` or empty defaults to `30`.    |

<hr>

###### Events

| Name     | Description                                                                                                                              | Arguments                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `Change` | Fired when the value changes: a day is picked or toggled, a range is completed, a time dropdown changes, or the value is cleared. Not fired for the same value. | `Identifier` (`Text`), `DateTimeList` (`DateTime List`) |
| `Blur`   | Fired when focus leaves the component. The trigger, its clear control and the calendar popup count as one, so moving between them does not fire it. | `Identifier` (`Text`)                                  |
| `Clear`  | Fired when the user clears the value: the trigger ✕ (right away), or the footer **Clear** followed by **Apply**. Fired after `Change`. Not fired for footer Clear without Apply. | `Identifier` (`Text`)                                  |
