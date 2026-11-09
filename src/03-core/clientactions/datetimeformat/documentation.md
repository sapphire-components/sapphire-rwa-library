###### Overview

A utility method that formats a date/time value for display using the browser’s `Intl.DateTimeFormat` API.

Use `SapphireRWALibrary.DateTimeFormat` when you need a locale-aware date and/or time string (for example in expressions, labels, or lists) without building formatting options yourself. It respects the app’s current locale from `SapphireRWALibrary.State.locale` when no locale is passed, and returns a plain `Text` string ready to show in the UI.

- Pass `MaskPattern` to build the string yourself with formatting tokens (for example `d/m/Y H:i` or `l, F j, Y`). Text tokens follow `Locale`.
- Pass `DateStyle` and/or `TimeStyle` for common presets (`full`, `long`, `medium`, `short`) when `MaskPattern` is empty.
- Use `Options` to merge any extra `Intl.DateTimeFormat` options (for example `hour12`, `timeZone`, or individual field options). `timeZone` also applies to `MaskPattern`.
- On failure (invalid locale, time zone, or options), the method returns a string starting with `ERROR:` instead of throwing.

<hr>

###### Method

| Name             | Returns | Description                                                                  |
| ---------------- | ------- | ---------------------------------------------------------------------------- |
| `DateTimeFormat` | `Text`  | Formats `DateTime` for the given (or current) locale and returns the result. |

<hr>

###### Input parameters

| Name        | Type                    | Description                                                                                                                                                          |
| ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DateTime`  | `Date`                  | The date/time to format. If empty, or the OutSystems null date (`1900-01-01 00:00:00`), the current date/time (`new Date()`) is used.                                |
| `Locale`    | `Text`                  | BCP 47 locale code (for example `en-US`, `pt-PT`). If empty, falls back to `SapphireRWALibrary.State.locale`.                                                        |
| `DateStyle`   | `Text`                  | Optional date preset passed to `Intl.DateTimeFormat`. Supported values: `full`, `long`, `medium`, `short`. Omit to leave the date part unset. Ignored when `MaskPattern` is set. |
| `TimeStyle`   | `Text`                  | Optional time preset passed to `Intl.DateTimeFormat`. Supported values: `full`, `long`, `medium`, `short`. Omit to leave the time part unset. Ignored when `MaskPattern` is set. |
| `MaskPattern` | `Text`                  | Optional token pattern. When non-empty, the result is built from these tokens instead of `DateStyle`, `TimeStyle`, and the field settings in `Options`. Literal characters are copied as-is. |
| `Options`     | `DateTimeFormatOptions` | Optional object merged into the formatter options after `DateStyle` / `TimeStyle`. Use for advanced `Intl.DateTimeFormat` settings not covered by the style presets. `timeZone` still applies when `MaskPattern` is set. |

<hr>

###### `DateTimeFormatOptions` structure

| Property       | Type      | Description                                                                                                                                                                        |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weekday`      | `Text`    | Weekday representation. Supported values: `long` (`Monday`), `short` (`Mon`), `narrow` (`M`).                                                                                      |
| `day`          | `Text`    | Day of the month. Supported values: `numeric` (`1`), `2-digit` (`01`).                                                                                                             |
| `month`        | `Text`    | Month representation. Supported values: `numeric` (`3`), `2-digit` (`03`), `long` (`March`), `short` (`Mar`), `narrow` (`M`).                                                      |
| `year`         | `Text`    | Year representation. Supported values: `numeric` (`2026`), `2-digit` (`26`).                                                                                                       |
| `hour12`       | `Boolean` | When `True`, uses a 12-hour clock (AM/PM); when `False`, uses 24-hour. If omitted, follows the locale default.                                                                     |
| `timeZone`     | `Text`    | IANA time zone to format in (for example `UTC`, `Europe/Lisbon`, `America/New_York`). Defaults to the browser/device time zone when omitted.                                       |
| `timeZoneName` | `Text`    | How the time zone is labeled. Supported values: `short`, `long`, `shortOffset`, `longOffset`, `shortGeneric`, `longGeneric` (for example `GMT`, `Pacific Standard Time`, `GMT-8`). |
| `hour`         | `Text`    | Hour field. Supported values: `numeric` (`1` or `13`), `2-digit` (`01` or `13`).                                                                                                   |
| `minute`       | `Text`    | Minute field. Supported values: `numeric` (`1`), `2-digit` (`01`).                                                                                                                 |
| `second`       | `Text`    | Second field. Supported values: `numeric` (`1`), `2-digit` (`01`).                                                                                                                 |

<hr>

###### `MaskPattern` tokens

Each character below is a token. Any other character, including spaces and punctuation, is copied into the result. Prefix a token with `\` to print that character instead of formatting it (`Y-m-d\Z` keeps a literal `Z`).

| Token | Description                                              | Example                                      |
| ----- | -------------------------------------------------------- | -------------------------------------------- |
| `d`   | Day of the month, 2 digits                               | `01` to `31`                                 |
| `D`   | Short weekday name for `Locale`                          | `Mon`                                        |
| `l`   | Full weekday name for `Locale`                           | `Monday`                                     |
| `j`   | Day of the month                                         | `1` to `31`                                  |
| `J`   | Day of the month with an English ordinal suffix          | `1st`, `2nd`, `3rd`, `4th`                   |
| `w`   | Weekday number                                           | `0` (Sunday) through `6` (Saturday)          |
| `W`   | ISO week number                                          | `1` through `53`                             |
| `F`   | Full month name for `Locale`                             | `January`                                    |
| `m`   | Month number, 2 digits                                   | `01` through `12`                            |
| `n`   | Month number                                             | `1` through `12`                             |
| `M`   | Short month name for `Locale`                            | `Jan`                                        |
| `U`   | Seconds since the Unix epoch                             | `1413704993`                                 |
| `y`   | Year, 2 digits                                           | `99` or `03`                                 |
| `Y`   | Year, 4 digits                                           | `1999` or `2003`                             |
| `Z`   | ISO date-time in UTC                                     | `2017-03-04T01:23:43.000Z`                   |
| `H`   | Hour, 24-hour, 2 digits                                  | `00` to `23`                                 |
| `h`   | Hour, 12-hour                                            | `1` to `12`                                  |
| `G`   | Hour, 12-hour, 2 digits                                  | `01` to `12`                                 |
| `i`   | Minutes, 2 digits                                        | `00` to `59`                                 |
| `S`   | Seconds, 2 digits                                        | `00` to `59`                                 |
| `s`   | Seconds                                                  | `0` to `59`                                  |
| `K`   | Day period for `Locale`                                  | `AM` or `PM`                                 |

Examples for `en-US`: `d/m/Y H:i` → `04/03/2026 13:05`. `l, F j, Y` → `Wednesday, March 4, 2026`.

<hr>

###### Return value

| Type   | Description                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `Text` | The formatted date/time string for the resolved locale and options, or `ERROR: …` with the failure message. |

<hr>

###### Notes

- A non-empty `MaskPattern` defines the whole result. `DateStyle`, `TimeStyle`, and field settings inside `Options` are not applied. `Options.timeZone` still selects the time zone those tokens are read in. `Z` is always the UTC ISO string.
- When `MaskPattern` is empty, at least one of `DateStyle`, `TimeStyle`, or meaningful `Options` should be provided; otherwise the formatter may use the browser default and the result can vary.
- `Options` overrides conflicting keys from `DateStyle` / `TimeStyle` because it is applied last via `Object.assign`.
- `J` always uses English ordinal suffixes (`1st`, `2nd`, `3rd`). `D`, `l`, `F`, `M`, and `K` follow `Locale`.
- `W` is the ISO week number: Monday is the first day, and week 1 is the week that contains the first Thursday of the year.
- This is not a UI component: call it from client actions or expressions whenever you need a localized date/time string.
- Call it as `SapphireRWALibrary.DateTimeFormat`.
