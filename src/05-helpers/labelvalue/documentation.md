###### Overview

A layout helper for form fields. It arranges a label, a control, and an optional hint into a consistent structure: the label sits beside or above the control, and the hint is rendered below the control inside the value area.

The `LabelValue` helper does not own field logic or validation. It only handles presentation and accessibility: when the `Value` placeholder contains an input or checkbox with an `id`, the label text is wrapped in a `<label for="…">` so activating the label focuses the control.

<hr>

###### Input parameters

| Name              | Type            | Description                                                                                                                                 |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `IsMandatory`     | `boolean`       | When `True`, appends a red asterisk (`*`) after the label text.                                                                             |
| `LabelTopPadding` | `integer`       | Top padding applied to the label in horizontal orientation, in pixels. Used to align the label with the control. Defaults to platform value. |
| `LabelWidth`      | `SapphireScale` | Fixed width of the label column when `Orientation` is `horizontal`. Ignored in vertical orientation.                                        |
| `Orientation`     | `string`        | Layout direction: `horizontal` places the label and control side by side; `vertical` stacks the label above the control.                    |

<hr>

###### Placeholders

| Name    | Description                                                                 |
| ------- | --------------------------------------------------------------------------- |
| `Hint`  | Optional helper text shown below the control.                               |
| `Label` | Label text displayed next to or above the control.                          |
| `Value` | The form control or read-only content associated with the label.            |
