###### Overview

A static utility method that formats a date/time value for display using the browser’s `Intl.DateTimeFormat` API.

Use `Locale.DateTimeFormat` when you need a locale-aware date and/or time string (for example in expressions, labels, or lists) without building formatting options yourself. It respects the app’s current locale from `SapphireRWALibrary.State.locale` when no locale is passed, and returns a plain `Text` string ready to show in the UI.

- Pass `DateStyle` and/or `TimeStyle` for common presets (`full`, `long`, `medium`, `short`).
- Use `AdditionalOptions` to merge any extra `Intl.DateTimeFormat` options (for example `hour12`, `timeZone`, or individual field options).
- On failure (invalid locale or options), the method returns a string starting with `ERROR:` instead of throwing.

<hr>

###### Method

| Name             | Returns | Description                                                                  |
| ---------------- | ------- | ---------------------------------------------------------------------------- |
| `DateTimeFormat` | `Text`  | Formats `DateTime` for the given (or current) locale and returns the result. |

<hr>

###### Input parameters

| Name        | Type                    | Description                                                                                                                                                          |
| ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DateTime`  | `Date`                  | The date/time to format. If empty, the current date/time (`new Date()`) is used.                                                                                     |
| `Locale`    | `Text`                  | BCP 47 locale code (for example `en-US`, `pt-PT`). If empty, falls back to `SapphireRWALibrary.State.locale`.                                                        |
| `DateStyle` | `Text`                  | Optional date preset passed to `Intl.DateTimeFormat`. Supported values: `full`, `long`, `medium`, `short`. Omit to leave the date part unset.                        |
| `TimeStyle` | `Text`                  | Optional time preset passed to `Intl.DateTimeFormat`. Supported values: `full`, `long`, `medium`, `short`. Omit to leave the time part unset.                        |
| `Options`   | `DateTimeFormatOptions` | Optional object merged into the formatter options after `DateStyle` / `TimeStyle`. Use for advanced `Intl.DateTimeFormat` settings not covered by the style presets. |

<hr>

###### `DateTimeFormatOptions` structure

| Property       | Type      | Description                                                                                                                                                                      |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weekday`      | `Text`    | Weekday representation. Supported values: `long` (`Monday`), `short` (`Mon`), `narrow` (`M`).                                                                                    |
| `day`          | `Text`    | Day of the month. Supported values: `numeric` (`1`), `2-digit` (`01`).                                                                                                           |
| `month`        | `Text`    | Month representation. Supported values: `numeric` (`3`), `2-digit` (`03`), `long` (`March`), `short` (`Mar`), `narrow` (`M`).                                                     |
| `year`         | `Text`    | Year representation. Supported values: `numeric` (`2026`), `2-digit` (`26`).                                                                                                     |
| `hour12`       | `Boolean` | When `True`, uses a 12-hour clock (AM/PM); when `False`, uses 24-hour. If omitted, follows the locale default.                                                                   |
| `timeZone`     | `Text`    | IANA time zone to format in (for example `UTC`, `Europe/Lisbon`, `America/New_York`). Defaults to the browser/device time zone when omitted.                                     |
| `timeZoneName` | `Text`    | How the time zone is labeled. Supported values: `short`, `long`, `shortOffset`, `longOffset`, `shortGeneric`, `longGeneric` (for example `GMT`, `Pacific Standard Time`, `GMT-8`). |
| `hour`         | `Text`    | Hour field. Supported values: `numeric` (`1` or `13`), `2-digit` (`01` or `13`).                                                                                                 |
| `minute`       | `Text`    | Minute field. Supported values: `numeric` (`1`), `2-digit` (`01`).                                                                                                               |
| `second`       | `Text`    | Second field. Supported values: `numeric` (`1`), `2-digit` (`01`).                                                                                                               |

<hr>

###### Return value

| Type   | Description                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `Text` | The formatted date/time string for the resolved locale and options, or `ERROR: …` with the failure message. |

<hr>

###### Notes

- At least one of `DateStyle`, `TimeStyle`, or meaningful `Options` should be provided; otherwise the formatter may use the browser default and the result can vary.
- `Options` overrides conflicting keys from `DateStyle` / `TimeStyle` because it is applied last via `Object.assign`.
- This is not a UI component: call it from client actions or expressions whenever you need a localized date/time string.
