###### Overview

A layout helper that wraps a platform `Input` placed in a placeholder. The input itself is not part of the helper: `InputWrapper` only augments the native field with optional clear behaviour and a leading icon through CSS and JavaScript.

- Place a Service Studio native `Input` in the `Input` placeholder. The helper finds that input at runtime and wires behaviour around it.
- When `HasClear` is `True` and the field has content, a clear control is shown beside the input; activating it (click or `Enter` / `Space`) fires `Clear`. The consumer is responsible for clearing the input value.
- When `IconName` is set, a leading icon is rendered at the start of the input.
- While `Enabled` is `False`, the clear control is disabled and does not fire `Clear`.

<hr>

###### Input parameters

| Name         | Type            | Description                                                                  |
| ------------ | --------------- | ---------------------------------------------------------------------------- |
| `AlignToEnd` | `Boolean`       |                                                                              |
| `Enabled`    | `Boolean`       | Enables or disables the clear control. Disabled clear does not fire `Clear`. |
| `HasClear`   | `Boolean`       | When `True`, shows a clear control while the wrapped input has content.      |
| `IconName`   | `Text`          | Optional leading icon name. Empty string hides the icon.                     |
| `Size`       | `SapphireSize`  |                                                                              |
| `Width`      | `SapphireScale` |                                                                              |

<hr>

###### Placeholders

| Name    | Description                                                                  |
| ------- | ---------------------------------------------------------------------------- |
| `Input` | The platform input to enhance. Not owned by the helper; observed at runtime. |

<hr>

###### Events

| Name    | Description                                                                                                   | Arguments |
| ------- | ------------------------------------------------------------------------------------------------------------- | --------- |
| `Clear` | Fired when the clear control is activated (click or `Enter` / `Space`). Clear the input value in the handler. | —         |
