###### Overview

A time picker that generates its UI inside the widget root (`.hourpicker`): a `.hourpicker-component` row, then a `.validation-message` below it when invalid. Values are always 24h. Incoming `Value` may be `HH`, `HH:mm`, or `HH:mm:ss`. `Change` emits only as much as `TimePrecision` needs: `HH` for `hour`, `HH:mm` for `minute`, `HH:mm:ss` for `second`. The `TimeFormat` enumerable only changes how the time is shown.

- `UseInput` = `True` renders a masked text field. `Change` fires on **blur** (empty, parsed, or clamped to `Start`/`End`). Invalid text reverts to the last committed value.
- `UseInput` = `False` renders native `<select>` dropdowns so the option list can overflow the browser chrome. Hours always appear. Minutes appear when `TimePrecision` is `minute` or `second`. Seconds appear when `TimePrecision` is `second`. `Change` fires on each select change.
- `TimeFormat` = `12h` (`h12`) adds an AM/PM dropdown to the right of the field(s). The hour dropdown lists clock hours `1`–`12` for the current period. AM/PM is display-only; the stored value stays 24h. `24h` (`h24`) is the default. Unknown values fall back to `24h`.
- `TimePrecision` is a `TimePrecision` value: `hour`, `minute` (default), or `second`. Unknown values fall back to `minute`. Unused units are omitted from the emitted value (internally they stay `00`).
- `Start` and `End` limit what can be chosen. Dropdown options are filtered to times in range; typed values are clamped on blur. Changing hour snaps minutes/seconds if they fall outside the range. An OutSystems `Time` of `00:00:00` for `End` is treated as no upper bound (`23:59:59`).
- `Step` applies to minutes when `TimePrecision` is `minute` (default `30`) and to seconds when it is `second` (default `30`). Hours are always listed one-by-one. Minutes stay every `1` when precision is `second`.
- Empty is allowed. `IsValid` / `ValidationMessage` are controlled from outside.
- `Size` is a `SapphireSize` value that sets the control height. `m` (and `base`) keep the default 40px fields. Unknown values fall back to `m`.

<hr>

###### Input parameters

| Name                | Type                   | Description                                                                                                                                                          |
| ------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Enabled`           | `Boolean`              | Enables or disables interaction. Disabled fields ignore pointer events and use disabled styling.                                                                     |
| `End`               | `Time`                 | Inclusive upper bound (`HH:mm:ss`). Empty or `00:00:00` (OutSystems Time default) falls back to `23:59:59`.                                                          |
| `IsValid`           | `Boolean`              | When `False`, marks the component invalid and shows `ValidationMessage` below the fields.                                                                            |
| `Size`              | `SapphireSize`         | Height preset for the input / selects. Supported: `xs` (22px), `s` (32px), `m` / `base` (40px, default), `l` (48px), `xl` (56px). Other enumerable values fall back to `m`. |
| `Start`             | `Time`                 | Inclusive lower bound (`HH:mm:ss`). Empty falls back to `00:00:00`.                                                                                                  |
| `Step`              | `Integer`              | Minute step when `TimePrecision` is `minute`, second step when it is `second`. Ignored for `hour`. `0` or empty defaults to `30`.                                    |
| `TimeFormat`        | `TimeFormat`           | Display format. `24h` / `h24` (default) or `12h` / `h12`. `12h` shows clock hours `1`–`12` and an AM/PM dropdown. Unknown values fall back to `24h`. Stored values stay 24h. |
| `TimePrecision`     | `TimePrecision`        | Visible units: `hour`, `minute` (default), or `second`. Emitted value is `HH`, `HH:mm`, or `HH:mm:ss` to match. Unknown values fall back to `minute`.                 |
| `UseInput`          | `Boolean`              | When `True`, the user types a masked time. When `False`, native dropdowns are used.                                                                                  |
| `ValidationMessage` | `Text`                 | Message shown below the component while `IsValid` is `False`.                                                                                                        |
| `Value`             | `Time` / `Text`        | Current 24h time. Accepts `HH`, `HH:mm`, or `HH:mm:ss`. Empty means no time selected.                                                                                |

<hr>

###### Events

| Name     | Description                                                                                                                          | Arguments                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `Change` | Fired when the committed 24h value changes: on input blur, on dropdown change, or when AM/PM changes a committed value. Empty emits `""`. Precision `hour` emits `HH`, `minute` emits `HH:mm`, `second` emits `HH:mm:ss`. | `Identifier` (`Text`), `Value` (`Text`) |
