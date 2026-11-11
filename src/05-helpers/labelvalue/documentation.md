###### Overview

A layout helper for form fields. It arranges a label, a control, and an optional hint into a consistent structure: the label sits beside or above the control, and the hint is rendered below the control inside the value area.

The `LabelValue` helper does not own field logic or validation. It only handles presentation and accessibility: when the `Value` placeholder contains an input or checkbox with an `id`, the label text is wrapped in a `<label for="…">` so activating the label focuses the control.

<hr>

###### Input parameters

| Name              | Type           | Description                                                                                                                                                  |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ExtendedClass`   | `Text`         | Extra CSS classes added to the component root, separated by spaces.                                                                                         |
| `IsMandatory`     | `Boolean`      | When `True`, appends a red asterisk (`*`) after the label text.                                                                                             |
| `LabelTopPadding` | `Integer`      | Top padding of the label in pixels when `Orientation` is `Horizontal`, to align it with the control. Use `2` for a checkbox and `6` for an input (default). |
| `LabelWidth`      | `SapphireSize` | Width of the label column when `Orientation` is `Horizontal`. Ignored when `Vertical`. Defaults to `M` (160px).                                             |
| `Orientation`     | `Orientation`  | Layout direction. `Horizontal` places the label beside the control; `Vertical` stacks the label above it. Defaults to `Horizontal`.                         |
| `Width`           | `SapphireSize` | Width preset for the helper (`auto`, `xs`–`xl7`, `full`, and so on), written to `data-widthcomponent`. Defaults to `XL2` (480px).                          |

<hr>

###### Placeholders

| Name    | Description                                                                 |
| ------- | --------------------------------------------------------------------------- |
| `Hint`  | Optional helper text shown below the control.                               |
| `Label` | Label text displayed next to or above the control.                          |
| `Value` | The form control or read-only content associated with the label.            |
