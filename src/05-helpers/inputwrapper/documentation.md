###### Overview

A layout helper that wraps a platform `Input` placed in a placeholder. The input itself is not part of the helper: `InputWrapper` only augments the native field with optional clear behaviour, a leading icon, sizing, and alignment through CSS and JavaScript.

- Place a Service Studio native `Input` in the `Input` placeholder. The helper finds that input at runtime and wires behaviour around it.
- When `HasClear` is `True` and the field has content, a clear control is shown beside the input; activating it (click or `Enter` / `Space`) fires `Clear`. The consumer is responsible for clearing the input value.
- When `IconName` is set, a leading icon is rendered at the start of the input.
- `AlignToEnd` flips the input text alignment to the end edge (logical; respects RTL).
- `Size` and `Width` control the field’s height / padding presets and container width.
- While `Enabled` is `False`, the input looks and behaves disabled and the clear control does not fire `Clear`.

<hr>

###### Input parameters

| Name         | Type            | Description                                                                                                         |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `AlignToEnd` | `Boolean`       | When `True`, aligns the input text to the end edge (`text-align: end`). When `False`, text aligns to the start.     |
| `Enabled`    | `Boolean`       | Enables or disables the field. When `False`, applies disabled styling, blocks input interaction, and disables clear. |
| `HasClear`   | `Boolean`       | When `True`, shows a clear control while the wrapped input has content.                                             |
| `IconName`   | `Text`          | Optional leading icon name. Empty string hides the icon.                                                            |
| `Size`       | `SapphireSize`  | Height / padding preset for the input. Supported overrides: `xs`, `s`. Other values keep the platform default size. |
| `Width`      | `SapphireScale` | Width preset for the wrapper (`auto`, `xs`–`xl7`, `full`, etc.).                                                    |

<hr>

###### Placeholders

| Name    | Description                                                                  |
| ------- | ---------------------------------------------------------------------------- |
| `Input` | The platform input to enhance. Not owned by the helper; observed at runtime. |

<hr>

###### Events

| Name    | Description                                                                                                   | Arguments             |
| ------- | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| `Clear` | Fired when the clear control is activated (click or `Enter` / `Space`). Clear the input value in the handler. | `Identifier` (`Text`) |
