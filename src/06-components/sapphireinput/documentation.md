###### Overview

A text / numeric input with optional clear button, leading icon, validation message, and stepper controls. It masks and clamps values according to `Type` and `NumericOptions`, and can debounce `Change` while typing.

- `Type` controls input behaviour: `text` (free text, start-aligned), `integer` (digits only), or `decimal` (digits plus a decimal part limited by `DecimalScale`).
- For numeric types, display uses a comma as the decimal separator; the internal / emitted value uses a dot.
- When `HasSteps` is `True` (numeric types), minus / plus controls appear and `ArrowUp` / `ArrowDown` step by `Step`, respecting `Min` / `Max`.
- When `HasClear` is `True` and the field has content, a clear control is shown; activating it fires `Clear` (the consumer typically clears `Value`).
- On blur (and after the debounce window), the value is remasked, clamped to `Min`/`Max`, and `Change` is emitted if it changed. `Enter` flushes any pending debounce, commits, then fires `EnterKey`.
- When `IsValid` is `False`, the field is marked invalid and `ValidationMessage` is shown below it. Externally set values outside type/bounds rules are flagged via `data-isoutofbounds` (red border) without rewriting the value.

<hr>

###### Input parameters

| Name                | Type                          | Description                                                                                                                          |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `DebounceChange`    | `Integer`                     | Delay in milliseconds before `Change` fires while typing. `0` emits on every input. Blur / Enter always flush immediately.           |
| `Enabled`           | `Boolean`                     | Enables or disables interaction. Disabled inputs ignore pointer events and use disabled styling.                                     |
| `HasClear`          | `Boolean`                     | When `True`, shows a clear control while the field has content.                                                                      |
| `HasSteps`          | `Boolean`                     | When `True`, shows minus / plus steppers (intended for numeric types) and enables arrow-key stepping.                                |
| `IconName`          | `Text`                        | Optional leading icon name. Empty string hides the icon and restores default start padding.                                          |
| `IsValid`           | `Boolean`                     | When `False`, marks the field invalid and shows `ValidationMessage`.                                                                 |
| `MaxLength`         | `Integer`                     | Maximum character length. `0` (or less) means no limit. Applies to typing and truncates externally set values.                       |
| `NumericOptions`    | `SapphireInputNumericOptions` | Bounds and precision for numeric types. See the structure below. Ignored for `text`.                                                 |
| `Placeholder`       | `Text`                        | Placeholder text shown when the field is empty.                                                                                      |
| `Type`              | `SapphireInputType`           | Input mode: `text`, `integer`, or `decimal`.                                                                                         |
| `ValidationMessage` | `Text`                        | Message shown below the field while `IsValid` is `False`.                                                                            |
| `Value`             | `Text`                        | Current value. Numeric consumers should treat the emitted value as using `.` as the decimal separator.                               |
| `Width`             | `SapphireScale`               | Width preset for the input container (`auto`, `xs`–`xl7`, `full`, etc.).                                                             |

<hr>

###### `SapphireInputNumericOptions` structure

Used when `Type` is `integer` or `decimal`. Empty / non-numeric `Min` or `Max` mean no bound.

| Property       | Type      | Description                                                                                          |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `DecimalScale` | `Integer` | Max digits after the decimal for `decimal` type. `0` (or with `integer`) disallows a fractional part. |
| `Max`          | `Text`    | Upper bound. Empty means no maximum. Steppers and commit clamp to this value.                        |
| `Min`          | `Text`    | Lower bound. Empty means no minimum. Steppers and commit clamp to this value.                        |
| `Step`         | `Decimal` | Amount added / subtracted by the steppers and `ArrowUp` / `ArrowDown`.                               |

<hr>

###### Placeholders

| Name   | Description                                                                |
| ------ | -------------------------------------------------------------------------- |
| `Hint` | Optional helper text rendered below the field (hidden when empty).         |

<hr>

###### Events

| Name       | Description                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `Change`   | Fired when the committed value changes (after debounce while typing, or immediately on blur / step). |
| `Clear`    | Fired when the clear control is activated (click or `Enter`).                                        |
| `EnterKey` | Fired when `Enter` is pressed, after any pending change has been flushed.                            |
