###### Overview

A button that reveals a dropdown panel of actions. It supports two modes: a regular button whose label toggles the panel, and a split button where the label runs its own `Click` action while a dedicated chevron opens the panel.

- In regular mode the label is the trigger: activating it (click or `Enter`/`Space`, `ArrowDown` to open) toggles the panel.
- In split-button mode a chevron is appended after the label and becomes the trigger; the label instead fires the `Click` event.
- The panel closes when a menu action (link or button) is activated, on `Escape`, or on click outside. Form controls inside the panel do not close it.

<hr>

###### Input parameters

| Name                | Type            | Description                                                                                     |
| ------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `ButtonClass`       | `string`        | Allows to style the button to the existing semantic versions.                                   |
| `Enabled`           | `boolean`       | Enables or disables all interaction. Disabled dropdowns close any open panel.                   |
| `IsSplitButton`     | `boolean`       | When `True`, renders a separate chevron trigger and the label fires `Click` instead of opening. |
| `IsValid`           | `boolean`       | When `False`, marks the component invalid and shows `ValidationMessage` below it.               |
| `Placement`         | `string`        | Preferred placement of the actions panel relative to the trigger. Defaults to `bottom-start`.   |
| `ValidationMessage` | `string`        | Message shown below the widget while `IsValid` is `False`.                                      |
| `Width`             | `SapphireScale` | Sets the width of the component.                                                                |

<hr>

###### Placeholders

| Name      | Description                                            |
| --------- | ------------------------------------------------------ |
| `Label`   | Element that acts as the button label / trigger.       |
| `Actions` | Content of the dropdown panel (menu links or buttons). |

<hr>

###### Events

| Name    | Description                                                                        |
| ------- | ---------------------------------------------------------------------------------- |
| `Click` | Fired when the label is activated in split-button mode (click or `Enter`/`Space`). |
